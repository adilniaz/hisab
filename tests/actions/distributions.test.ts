import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    donation: { findUniqueOrThrow: vi.fn() },
    distribution: { create: vi.fn(), aggregate: vi.fn() },
  },
}))
vi.mock("@/lib/permissions", () => ({
  requireSession: vi.fn().mockResolvedValue({ user: { id: "u1", role: "ADMIN", scopeType: "ALL" } }),
  canWrite: vi.fn().mockReturnValue(true),
  recipientFilter: vi.fn().mockReturnValue({}),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { db } from "@/lib/db"
import { createDistribution } from "@/app/(dashboard)/distributions/actions"

describe("createDistribution — over-distribution guard", () => {
  beforeEach(() => vi.clearAllMocks())

  it("throws when amount exceeds designated donation remaining balance", async () => {
    vi.mocked(db.donation.findUniqueOrThrow).mockResolvedValue({
      amount: 5000,
      distributions: [{ amount: 4000 }],
    } as any)
    await expect(
      createDistribution({
        recipientId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000001",
        amount: 2000,
        date: "2026-06-27",
        purpose: "Medicine",
        donationId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002",
        notes: "",
      })
    ).rejects.toThrow("exceeds remaining balance")
  })

  it("allows distribution within remaining balance", async () => {
    vi.mocked(db.donation.findUniqueOrThrow).mockResolvedValue({
      amount: 5000,
      distributions: [{ amount: 4000 }],
    } as any)
    vi.mocked(db.distribution.create).mockResolvedValue({} as any)
    await expect(
      createDistribution({
        recipientId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000001",
        amount: 1000,
        date: "2026-06-27",
        purpose: "Medicine",
        donationId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002",
        notes: "",
      })
    ).resolves.not.toThrow()
  })
})
