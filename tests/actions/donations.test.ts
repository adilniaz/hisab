import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { donation: { create: vi.fn() }, donor: { findMany: vi.fn() } },
}));
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi.fn(),
  canModify: vi.fn(),
  donorFilter: vi.fn().mockReturnValue({}),
  assertDonorInScope: vi.fn(),
  assertRecipientInScope: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { requireAuth, canModify } from "@/lib/permissions";
import { createDonation, getDonorsForPicker } from "@/app/(dashboard)/donations/actions";
import { mkSession } from "../helpers/session";

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

describe("createDonation — canModify enforcement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a VIEWER session before touching the database", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("VIEWER", "ALL"));
    vi.mocked(canModify).mockReturnValue(false);
    await expect(createDonation(validInput)).rejects.toThrow("Unauthorized");
    expect(prisma.donation.create).not.toHaveBeenCalled();
  });

  it("allows a DATA_ENTRY session", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("DATA_ENTRY", "ALL"));
    vi.mocked(canModify).mockReturnValue(true);
    await expect(createDonation(validInput)).resolves.not.toThrow();
    expect(prisma.donation.create).toHaveBeenCalled();
  });
});

describe("getDonorsForPicker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bounds the query with a take limit instead of loading every donor", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("ADMIN", "ALL"));
    vi.mocked(prisma.donor.findMany).mockResolvedValue([]);
    await getDonorsForPicker();
    expect(prisma.donor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: expect.any(Number) }),
    );
  });
});
