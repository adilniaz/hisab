import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => {
  const db: any = {
    donation: { findUniqueOrThrow: vi.fn(), aggregate: vi.fn() },
    distribution: { create: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
  }
  db.$transaction = vi.fn((cb: any) => cb(db))
  return { db }
})
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi.fn().mockResolvedValue({ user: { id: "u1", role: "ADMIN", scopeType: "ALL" } }),
  canModify: vi.fn().mockReturnValue(true),
  recipientFilter: vi.fn().mockReturnValue({}),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { db } from "@/lib/db"
import { createDistribution, updateDistribution } from "@/app/(dashboard)/distributions/actions"

const baseInput = {
  recipientId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000001",
  date: "2026-06-27",
  purpose: "Medicine",
  notes: "",
}

describe("createDistribution — designated donation balance guard", () => {
  beforeEach(() => vi.clearAllMocks())

  it("throws when amount exceeds designated donation remaining balance", async () => {
    vi.mocked(db.donation.findUniqueOrThrow).mockResolvedValue({
      amount: 5000,
      distributions: [{ amount: 4000 }],
    } as any)
    await expect(
      createDistribution({
        ...baseInput,
        amount: 2000,
        donationId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002",
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
        ...baseInput,
        amount: 1000,
        donationId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002",
      })
    ).resolves.not.toThrow()
  })

  it("runs the balance check and write inside a single Serializable transaction", async () => {
    vi.mocked(db.donation.findUniqueOrThrow).mockResolvedValue({ amount: 5000, distributions: [] } as any)
    vi.mocked(db.distribution.create).mockResolvedValue({} as any)
    await createDistribution({
      ...baseInput,
      amount: 1000,
      donationId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002",
    })
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" })
  })
})

describe("createDistribution — pool balance guard", () => {
  beforeEach(() => vi.clearAllMocks())

  it("throws when a pool distribution exceeds the pool balance", async () => {
    vi.mocked(db.donation.aggregate).mockResolvedValue({ _sum: { amount: 5000 } } as any)
    vi.mocked(db.distribution.aggregate).mockResolvedValue({ _sum: { amount: 4000 } } as any)
    await expect(
      createDistribution({ ...baseInput, amount: 2000, donationId: "" })
    ).rejects.toThrow("exceeds remaining pool balance")
  })

  it("allows a pool distribution within the pool balance", async () => {
    vi.mocked(db.donation.aggregate).mockResolvedValue({ _sum: { amount: 5000 } } as any)
    vi.mocked(db.distribution.aggregate).mockResolvedValue({ _sum: { amount: 4000 } } as any)
    vi.mocked(db.distribution.create).mockResolvedValue({} as any)
    await expect(
      createDistribution({ ...baseInput, amount: 1000, donationId: "" })
    ).resolves.not.toThrow()
  })
})

describe("updateDistribution — balance guard", () => {
  beforeEach(() => vi.clearAllMocks())

  it("throws when the new amount exceeds the designated donation's remaining balance", async () => {
    vi.mocked(db.donation.findUniqueOrThrow).mockResolvedValue({
      amount: 5000,
      distributions: [{ amount: 4000 }],
    } as any)
    await expect(
      updateDistribution("dist-1", {
        ...baseInput,
        amount: 2000,
        donationId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002",
      })
    ).rejects.toThrow("exceeds remaining balance")
  })

  it("excludes the distribution's own prior amount from the designated-donation check", async () => {
    vi.mocked(db.donation.findUniqueOrThrow).mockResolvedValue({ amount: 5000, distributions: [] } as any)
    vi.mocked(db.distribution.update).mockResolvedValue({} as any)
    await updateDistribution("dist-1", {
      ...baseInput,
      amount: 3000,
      donationId: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002",
    })
    expect(db.donation.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          distributions: expect.objectContaining({
            where: expect.objectContaining({ id: { not: "dist-1" } }),
          }),
        }),
      })
    )
  })

  it("excludes the distribution's own prior amount from the pool check", async () => {
    vi.mocked(db.donation.aggregate).mockResolvedValue({ _sum: { amount: 5000 } } as any)
    vi.mocked(db.distribution.aggregate).mockResolvedValue({ _sum: { amount: 4000 } } as any)
    vi.mocked(db.distribution.update).mockResolvedValue({} as any)
    await updateDistribution("dist-1", { ...baseInput, amount: 1000, donationId: "" })
    expect(db.distribution.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: "dist-1" } }) })
    )
  })
})
