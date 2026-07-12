import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return { ...actual, requireAuth: vi.fn() };
});

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import {
  createDonation,
  deleteDonation,
  getDonations,
} from "@/app/(dashboard)/donations/actions";
import { resetDb } from "../helpers/db";

function session(overrides: Partial<Session["user"]>): Session {
  return {
    user: {
      id: "placeholder",
      name: "T",
      email: "t@t.com",
      role: "ADMIN",
      scopeType: "ALL",
      tokenVersion: 0,
      ...overrides,
    } as unknown as Session["user"],
    expires: "2099-01-01",
  };
}

const validInput = {
  donorId: "",
  isAnonymous: true,
  amount: 1000,
  date: "2026-01-01",
  paymentMethod: "CASH" as const,
  paymentContext: "GENERAL" as const,
  type: "POOLED" as const,
  designatedRecipientId: "",
  notes: "",
};

describe("donations actions — DB integration", () => {
  let adminId: string;
  let restrictedId: string;
  let donorInScopeId: string;
  let donorOutOfScopeId: string;

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();

    const admin = await prisma.user.create({
      data: { name: "Admin", email: "admin@t.com", passwordHash: "x", role: "ADMIN", scopeType: "ALL" },
    });
    adminId = admin.id;

    const restricted = await prisma.user.create({
      data: {
        name: "Restricted",
        email: "restricted@t.com",
        passwordHash: "x",
        role: "DATA_ENTRY",
        scopeType: "RESTRICTED",
      },
    });
    restrictedId = restricted.id;

    const donorInScope = await prisma.donor.create({ data: { name: "In scope donor" } });
    donorInScopeId = donorInScope.id;
    const donorOutOfScope = await prisma.donor.create({ data: { name: "Out of scope donor" } });
    donorOutOfScopeId = donorOutOfScope.id;

    await prisma.userScope.create({ data: { userId: restrictedId, donorId: donorInScopeId } });
  });

  it("persists a real donation row for an authorized session", async () => {
    vi.mocked(requireAuth).mockResolvedValue(session({ id: adminId, role: "ADMIN" }));

    await createDonation(validInput);

    const rows = await prisma.donation.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ recordedById: adminId, amount: expect.anything() });
  });

  it("does not create a row when the session cannot modify (VIEWER)", async () => {
    vi.mocked(requireAuth).mockResolvedValue(session({ id: adminId, role: "VIEWER" }));

    await expect(createDonation(validInput)).rejects.toThrow("Unauthorized");
    expect(await prisma.donation.count()).toBe(0);
  });

  it("scopes getDonations to a RESTRICTED user's assigned donors", async () => {
    await prisma.donation.create({
      data: {
        donorId: donorInScopeId,
        amount: 500,
        date: new Date("2026-01-01"),
        paymentMethod: "CASH",
        paymentContext: "GENERAL",
        type: "POOLED",
        recordedById: adminId,
      },
    });
    await prisma.donation.create({
      data: {
        donorId: donorOutOfScopeId,
        amount: 700,
        date: new Date("2026-01-02"),
        paymentMethod: "CASH",
        paymentContext: "GENERAL",
        type: "POOLED",
        recordedById: adminId,
      },
    });

    vi.mocked(requireAuth).mockResolvedValue(
      session({ id: restrictedId, role: "DATA_ENTRY", scopeType: "RESTRICTED" }),
    );
    const restrictedResult = await getDonations();
    expect(restrictedResult.items).toHaveLength(1);
    expect(restrictedResult.items[0]?.donorId).toBe(donorInScopeId);

    vi.mocked(requireAuth).mockResolvedValue(session({ id: adminId, role: "ADMIN" }));
    const adminResult = await getDonations();
    expect(adminResult.items).toHaveLength(2);
  });

  it("excludes soft-deleted donations from getDonations", async () => {
    vi.mocked(requireAuth).mockResolvedValue(session({ id: adminId, role: "ADMIN" }));
    await createDonation(validInput);
    const [created] = await prisma.donation.findMany();

    await deleteDonation(created!.id);

    const result = await getDonations();
    expect(result.items).toHaveLength(0);
    const stillInDb = await prisma.donation.findUnique({ where: { id: created!.id } });
    expect(stillInDb?.deletedAt).not.toBeNull();
  });
});
