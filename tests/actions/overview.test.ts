import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    donation: { aggregate: vi.fn(), findMany: vi.fn() },
    distribution: { aggregate: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
  },
}));
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi
    .fn()
    .mockResolvedValue({ user: { id: "u1", role: "VIEWER", scopeType: "RESTRICTED" } }),
  donationFilter: vi.fn(),
  distributionFilter: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { donationFilter, distributionFilter } from "@/lib/permissions";
import { getDashboardData } from "@/app/(dashboard)/overview/actions";

const donationScope = { donor: { userScopes: { some: { userId: "u1" } } } };
const distributionScope = { recipient: { userScopes: { some: { userId: "u1" } } } };

describe("getDashboardData scope enforcement (audit H1 regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(donationFilter).mockReturnValue(donationScope);
    vi.mocked(distributionFilter).mockReturnValue(distributionScope);
    vi.mocked(prisma.donation.aggregate).mockResolvedValue({ _sum: { amount: 0 } } as never);
    vi.mocked(prisma.distribution.aggregate).mockResolvedValue({ _sum: { amount: 0 } } as never);
    vi.mocked(prisma.donation.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.distribution.findMany).mockResolvedValue([] as never);
  });

  it("applies the donation scope to every donation query (totals, pool, trends, recents, zakat)", async () => {
    await getDashboardData();

    const aggregateCalls = vi.mocked(prisma.donation.aggregate).mock.calls;
    const findManyCalls = vi.mocked(prisma.donation.findMany).mock.calls;
    // totalRcv + getPoolBalance aggregate; recents + trend + zakat + designated findMany
    expect(aggregateCalls.length).toBeGreaterThanOrEqual(2);
    expect(findManyCalls.length).toBeGreaterThanOrEqual(4);

    for (const call of [...aggregateCalls, ...findManyCalls]) {
      expect(call[0]!.where).toMatchObject(donationScope);
    }
  });

  it("applies the distribution scope to every distribution query", async () => {
    await getDashboardData();

    const aggregateCalls = vi.mocked(prisma.distribution.aggregate).mock.calls;
    const findManyCalls = vi.mocked(prisma.distribution.findMany).mock.calls;
    expect(aggregateCalls.length).toBeGreaterThanOrEqual(2);
    expect(findManyCalls.length).toBeGreaterThanOrEqual(2);

    for (const call of [...aggregateCalls, ...findManyCalls]) {
      expect(call[0]!.where).toMatchObject(distributionScope);
    }
  });

  it("passes no scope clauses for ALL-scope users", async () => {
    vi.mocked(donationFilter).mockReturnValue({});
    vi.mocked(distributionFilter).mockReturnValue({});
    await getDashboardData();

    for (const call of vi.mocked(prisma.donation.aggregate).mock.calls) {
      expect(call[0]!.where).not.toHaveProperty("donor");
    }
    for (const call of vi.mocked(prisma.distribution.aggregate).mock.calls) {
      expect(call[0]!.where).not.toHaveProperty("recipient");
    }
  });
});
