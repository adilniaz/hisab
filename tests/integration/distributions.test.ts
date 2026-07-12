import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Session } from "next-auth";

vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return { ...actual, requireAuth: vi.fn() };
});

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import {
  createDistribution,
  getDesignatedDonationsForRecipient,
} from "@/app/(dashboard)/distributions/actions";
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

describe("distributions actions — DB integration", () => {
  let adminId: string;
  let restrictedId: string;
  let recipientInScopeId: string;
  let recipientOutOfScopeId: string;
  let donationId: string;

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

    const recipientInScope = await prisma.recipient.create({
      data: { name: "In scope recipient", category: "FOOD" },
    });
    recipientInScopeId = recipientInScope.id;
    const recipientOutOfScope = await prisma.recipient.create({
      data: { name: "Out of scope recipient", category: "FOOD" },
    });
    recipientOutOfScopeId = recipientOutOfScope.id;

    await prisma.userScope.create({
      data: { userId: restrictedId, recipientId: recipientInScopeId },
    });

    const donation = await prisma.donation.create({
      data: {
        amount: 1000,
        date: new Date("2026-01-01"),
        paymentMethod: "CASH",
        paymentContext: "ZAKAT",
        type: "DESIGNATED",
        designatedRecipientId: recipientInScopeId,
        recordedById: adminId,
      },
    });
    donationId = donation.id;
  });

  it("creates a distribution within the donation's remaining balance", async () => {
    vi.mocked(requireAuth).mockResolvedValue(session({ id: adminId, role: "ADMIN" }));

    await createDistribution({
      recipientId: recipientInScopeId,
      amount: 400,
      date: "2026-01-05",
      purpose: "Groceries",
      donationId,
      notes: "",
    });

    const rows = await prisma.distribution.findMany();
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]!.amount)).toBe(400);
  });

  it("rejects a distribution that exceeds the donation's remaining balance", async () => {
    vi.mocked(requireAuth).mockResolvedValue(session({ id: adminId, role: "ADMIN" }));

    await createDistribution({
      recipientId: recipientInScopeId,
      amount: 700,
      date: "2026-01-05",
      purpose: "First distribution",
      donationId,
      notes: "",
    });

    await expect(
      createDistribution({
        recipientId: recipientInScopeId,
        amount: 400,
        date: "2026-01-06",
        purpose: "Second distribution — over budget",
        donationId,
        notes: "",
      }),
    ).rejects.toThrow(/exceeds remaining balance/);

    // The failed attempt must not have created a row.
    expect(await prisma.distribution.count()).toBe(1);
  });

  it("scopes getDesignatedDonationsForRecipient to the caller's assigned recipients", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      session({ id: restrictedId, role: "DATA_ENTRY", scopeType: "RESTRICTED" }),
    );

    const inScope = await getDesignatedDonationsForRecipient(recipientInScopeId);
    expect(inScope).toHaveLength(1);
    expect(inScope[0]?.remaining).toBe(1000);

    const outOfScope = await getDesignatedDonationsForRecipient(recipientOutOfScopeId);
    expect(outOfScope).toHaveLength(0);
  });
});
