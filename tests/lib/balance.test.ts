import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    donation: { aggregate: vi.fn(), findMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    distribution: { aggregate: vi.fn() },
  },
}))

import { db } from "@/lib/db"
import { getPoolBalance, getDonationRemainingBalance } from "@/lib/balance"

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
