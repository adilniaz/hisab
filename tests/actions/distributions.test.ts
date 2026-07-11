import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => {
  const mockDb = {
    donation: { findUniqueOrThrow: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
    distribution: { create: vi.fn(), update: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
  };
  return {
    prisma: {
      ...mockDb,
      $transaction: vi.fn((cb: (tx: typeof mockDb) => unknown) => cb(mockDb)),
    },
  };
});
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi.fn().mockResolvedValue({ user: { id: "u1", role: "ADMIN", scopeType: "ALL" } }),
  canModify: vi.fn().mockReturnValue(true),
  recipientFilter: vi.fn().mockReturnValue({}),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { canModify } from "@/lib/permissions";
import {
  createDistribution,
  updateDistribution,
  getDesignatedDonationsForRecipient,
} from "@/app/(dashboard)/distributions/actions";

const baseInput = {
  recipientId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000001",
  date: "2026-06-27",
  purpose: "Medicine",
  notes: "",
};

describe("createDistribution — canModify enforcement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a VIEWER session before touching the database", async () => {
    // mockReturnValueOnce so this doesn't leak into other describe blocks,
    // which rely on the module mock's default canModify() === true.
    vi.mocked(canModify).mockReturnValueOnce(false);
    await expect(
      createDistribution({
        ...baseInput,
        amount: 1000,
        donationId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002",
      }),
    ).rejects.toThrow("Unauthorized");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("createDistribution — designated donation balance guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws when amount exceeds designated donation remaining balance", async () => {
    vi.mocked(prisma.donation.findUniqueOrThrow).mockResolvedValue({
      amount: 5000,
      distributions: [{ amount: 4000 }],
    } as never);
    await expect(
      createDistribution({
        ...baseInput,
        amount: 2000,
        donationId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002",
      }),
    ).rejects.toThrow("exceeds remaining balance");
  });

  it("allows distribution within remaining balance", async () => {
    vi.mocked(prisma.donation.findUniqueOrThrow).mockResolvedValue({
      amount: 5000,
      distributions: [{ amount: 4000 }],
    } as never);
    await expect(
      createDistribution({
        ...baseInput,
        amount: 1000,
        donationId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002",
      }),
    ).resolves.not.toThrow();
  });

  it("runs the balance check and write inside a single Serializable transaction", async () => {
    vi.mocked(prisma.donation.findUniqueOrThrow).mockResolvedValue({
      amount: 5000,
      distributions: [],
    } as never);
    await createDistribution({
      ...baseInput,
      amount: 1000,
      donationId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002",
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
});

describe("createDistribution — pool balance guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws when a pool distribution exceeds the pool balance", async () => {
    vi.mocked(prisma.donation.aggregate).mockResolvedValue({ _sum: { amount: 5000 } } as never);
    vi.mocked(prisma.distribution.aggregate).mockResolvedValue({ _sum: { amount: 4000 } } as never);
    await expect(
      createDistribution({ ...baseInput, amount: 2000, donationId: "" }),
    ).rejects.toThrow("exceeds remaining pool balance");
  });

  it("allows a pool distribution within the pool balance", async () => {
    vi.mocked(prisma.donation.aggregate).mockResolvedValue({ _sum: { amount: 5000 } } as never);
    vi.mocked(prisma.distribution.aggregate).mockResolvedValue({ _sum: { amount: 4000 } } as never);
    await expect(
      createDistribution({ ...baseInput, amount: 1000, donationId: "" }),
    ).resolves.not.toThrow();
  });
});

describe("updateDistribution — balance guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws when the new amount exceeds the designated donation's remaining balance", async () => {
    vi.mocked(prisma.donation.findUniqueOrThrow).mockResolvedValue({
      amount: 5000,
      distributions: [{ amount: 4000 }],
    } as never);
    await expect(
      updateDistribution("dist-1", {
        ...baseInput,
        amount: 2000,
        donationId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002",
      }),
    ).rejects.toThrow("exceeds remaining balance");
  });

  it("excludes the distribution's own prior amount from the designated-donation check", async () => {
    vi.mocked(prisma.donation.findUniqueOrThrow).mockResolvedValue({
      amount: 5000,
      distributions: [],
    } as never);
    await updateDistribution("dist-1", {
      ...baseInput,
      amount: 3000,
      donationId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002",
    });
    expect(prisma.donation.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          distributions: expect.objectContaining({
            where: expect.objectContaining({ id: { not: "dist-1" } }),
          }),
        }),
      }),
    );
  });

  it("excludes the distribution's own prior amount from the pool check", async () => {
    vi.mocked(prisma.donation.aggregate).mockResolvedValue({ _sum: { amount: 5000 } } as never);
    vi.mocked(prisma.distribution.aggregate).mockResolvedValue({ _sum: { amount: 4000 } } as never);
    await updateDistribution("dist-1", { ...baseInput, amount: 1000, donationId: "" });
    expect(prisma.distribution.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: "dist-1" } }) }),
    );
  });
});

describe("getDesignatedDonationsForRecipient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns remaining balance per donation via groupBy, not a full join", async () => {
    vi.mocked(prisma.donation.findMany).mockResolvedValue([
      { id: "d1", amount: 5000, date: new Date("2026-01-01") },
      { id: "d2", amount: 3000, date: new Date("2026-01-02") },
    ] as never);
    vi.mocked(prisma.distribution.groupBy).mockResolvedValue([
      { donationId: "d1", _sum: { amount: 2000 } },
    ] as never);
    const result = await getDesignatedDonationsForRecipient("recipient-1");
    expect(result).toEqual([
      { id: "d1", amount: 5000, remaining: 3000, date: new Date("2026-01-01") },
      { id: "d2", amount: 3000, remaining: 3000, date: new Date("2026-01-02") },
    ]);
  });

  it("filters out fully-spent donations", async () => {
    vi.mocked(prisma.donation.findMany).mockResolvedValue([
      { id: "d1", amount: 1000, date: new Date("2026-01-01") },
    ] as never);
    vi.mocked(prisma.distribution.groupBy).mockResolvedValue([
      { donationId: "d1", _sum: { amount: 1000 } },
    ] as never);
    expect(await getDesignatedDonationsForRecipient("recipient-1")).toEqual([]);
  });

  it("skips the groupBy call when the recipient has no designated donations", async () => {
    vi.mocked(prisma.donation.findMany).mockResolvedValue([]);
    expect(await getDesignatedDonationsForRecipient("recipient-1")).toEqual([]);
    expect(prisma.distribution.groupBy).not.toHaveBeenCalled();
  });
});
