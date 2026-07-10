import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    donation: { aggregate: vi.fn(), findMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    distribution: { aggregate: vi.fn(), groupBy: vi.fn() },
  },
}))

import { db } from "@/lib/db"
import { getPoolBalance, getDonationRemainingBalance, getDesignatedUnspent } from "@/lib/balance"

describe("getPoolBalance", () => {
  it("subtracts pool distributions from pooled donations", async () => {
    vi.mocked(db.donation.aggregate).mockResolvedValue({ _sum: { amount: 100000 } } as any)
    vi.mocked(db.distribution.aggregate).mockResolvedValue({ _sum: { amount: 30000 } } as any)
    expect(await getPoolBalance()).toBe(70000)
  })
  it("handles null sums", async () => {
    vi.mocked(db.donation.aggregate).mockResolvedValue({ _sum: { amount: null } } as any)
    vi.mocked(db.distribution.aggregate).mockResolvedValue({ _sum: { amount: null } } as any)
    expect(await getPoolBalance()).toBe(0)
  })
})

describe("getDonationRemainingBalance", () => {
  it("returns donation minus linked distributions", async () => {
    vi.mocked(db.donation.findUniqueOrThrow).mockResolvedValue({
      amount: 50000,
      distributions: [{ amount: 20000 }, { amount: 10000 }],
    } as any)
    expect(await getDonationRemainingBalance("d1")).toBe(20000)
  })
  it("never returns negative", async () => {
    vi.mocked(db.donation.findUniqueOrThrow).mockResolvedValue({
      amount: 5000,
      distributions: [{ amount: 5000 }],
    } as any)
    expect(await getDonationRemainingBalance("d2")).toBe(0)
  })
})

describe("getDesignatedUnspent", () => {
  beforeEach(() => vi.clearAllMocks())

  it("sums remaining balance across designated donations via groupBy, not a full join", async () => {
    vi.mocked(db.donation.findMany).mockResolvedValue([
      { id: "d1", amount: 5000 },
      { id: "d2", amount: 3000 },
    ] as any)
    vi.mocked(db.distribution.groupBy).mockResolvedValue([
      { donationId: "d1", _sum: { amount: 2000 } },
    ] as any)
    // d1: 5000 - 2000 = 3000 remaining; d2: 3000 - 0 = 3000 remaining
    expect(await getDesignatedUnspent()).toBe(6000)
    expect(db.donation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, amount: true } })
    )
  })

  it("never lets a single donation's unspent go negative", async () => {
    vi.mocked(db.donation.findMany).mockResolvedValue([{ id: "d1", amount: 1000 }] as any)
    vi.mocked(db.distribution.groupBy).mockResolvedValue([
      { donationId: "d1", _sum: { amount: 1500 } },
    ] as any)
    expect(await getDesignatedUnspent()).toBe(0)
  })

  it("skips the groupBy call entirely when there are no designated donations", async () => {
    vi.mocked(db.donation.findMany).mockResolvedValue([])
    expect(await getDesignatedUnspent()).toBe(0)
    expect(db.distribution.groupBy).not.toHaveBeenCalled()
  })
})
