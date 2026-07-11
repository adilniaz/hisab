import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    donation: { findFirst: vi.fn(), findMany: vi.fn() },
    distribution: { findFirst: vi.fn(), findMany: vi.fn() },
    donor: { findFirst: vi.fn(), findMany: vi.fn() },
    recipient: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}))
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi.fn().mockResolvedValue({ user: { id: "u1", role: "VIEWER", scopeType: "RESTRICTED" } }),
  donorFilter: vi.fn(),
  recipientFilter: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { donorFilter, recipientFilter } from "@/lib/permissions"
import { getDonation } from "@/app/(dashboard)/donations/actions"
import { getDistribution } from "@/app/(dashboard)/distributions/actions"
import {
  getDonorStatement,
  getRecipientHistory,
  getAllDonors,
  getAllRecipients,
  getAuditReport,
} from "@/app/(dashboard)/reports/actions"

const restrictedFilter = { userScopes: { some: { userId: "u1" } } }

describe("scope enforcement on single-record reads (IDOR regression)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("getDonation includes the donor scope filter returned by donorFilter", async () => {
    vi.mocked(donorFilter).mockReturnValue(restrictedFilter)
    vi.mocked(prisma.donation.findFirst).mockResolvedValue(null)
    await getDonation("d1")
    expect(prisma.donation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "d1", donor: restrictedFilter }),
      })
    )
  })

  it("getDonation applies no donor filter when donorFilter returns {} (ALL scope)", async () => {
    vi.mocked(donorFilter).mockReturnValue({})
    vi.mocked(prisma.donation.findFirst).mockResolvedValue(null)
    await getDonation("d1")
    const where = vi.mocked(prisma.donation.findFirst).mock.calls[0]![0]!.where
    expect(where).not.toHaveProperty("donor")
  })

  it("getDistribution includes the recipient scope filter returned by recipientFilter", async () => {
    vi.mocked(recipientFilter).mockReturnValue(restrictedFilter)
    vi.mocked(prisma.distribution.findFirst).mockResolvedValue(null)
    await getDistribution("dist1")
    expect(prisma.distribution.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "dist1", recipient: restrictedFilter }),
      })
    )
  })

  it("getDistribution applies no recipient filter when recipientFilter returns {} (ALL scope)", async () => {
    vi.mocked(recipientFilter).mockReturnValue({})
    vi.mocked(prisma.distribution.findFirst).mockResolvedValue(null)
    await getDistribution("dist1")
    const where = vi.mocked(prisma.distribution.findFirst).mock.calls[0]![0]!.where
    expect(where).not.toHaveProperty("recipient")
  })

  it("getDonorStatement rejects a donor outside the caller's scope", async () => {
    vi.mocked(donorFilter).mockReturnValue(restrictedFilter)
    vi.mocked(prisma.donor.findFirst).mockResolvedValue(null)
    await expect(getDonorStatement("donor1")).rejects.toThrow("not found")
    expect(prisma.donor.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "donor1", ...restrictedFilter }),
      })
    )
  })

  it("getRecipientHistory rejects a recipient outside the caller's scope", async () => {
    vi.mocked(recipientFilter).mockReturnValue(restrictedFilter)
    vi.mocked(prisma.recipient.findFirst).mockResolvedValue(null)
    await expect(getRecipientHistory("rec1")).rejects.toThrow("not found")
    expect(prisma.recipient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "rec1", ...restrictedFilter }),
      })
    )
  })

  it("getAllDonors scopes the donor list using donorFilter", async () => {
    vi.mocked(donorFilter).mockReturnValue(restrictedFilter)
    vi.mocked(prisma.donor.findMany).mockResolvedValue([])
    await getAllDonors()
    expect(prisma.donor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining(restrictedFilter) })
    )
  })

  it("getAllRecipients scopes the recipient list using recipientFilter", async () => {
    vi.mocked(recipientFilter).mockReturnValue(restrictedFilter)
    vi.mocked(prisma.recipient.findMany).mockResolvedValue([])
    await getAllRecipients()
    expect(prisma.recipient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining(restrictedFilter) })
    )
  })

  it("getAuditReport scopes both donations and distributions", async () => {
    vi.mocked(donorFilter).mockReturnValue(restrictedFilter)
    vi.mocked(recipientFilter).mockReturnValue(restrictedFilter)
    vi.mocked(prisma.donation.findMany).mockResolvedValue([])
    vi.mocked(prisma.distribution.findMany).mockResolvedValue([])
    await getAuditReport("2026-01-01", "2026-01-31")
    expect(prisma.donation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ donor: restrictedFilter }) })
    )
    expect(prisma.distribution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ recipient: restrictedFilter }) })
    )
  })

  it("getAuditReport applies no scope filter when donorFilter/recipientFilter return {} (ALL scope)", async () => {
    vi.mocked(donorFilter).mockReturnValue({})
    vi.mocked(recipientFilter).mockReturnValue({})
    vi.mocked(prisma.donation.findMany).mockResolvedValue([])
    vi.mocked(prisma.distribution.findMany).mockResolvedValue([])
    await getAuditReport("2026-01-01", "2026-01-31")
    const donationWhere = vi.mocked(prisma.donation.findMany).mock.calls[0]![0]!.where
    const distributionWhere = vi.mocked(prisma.distribution.findMany).mock.calls[0]![0]!.where
    expect(donationWhere).not.toHaveProperty("donor")
    expect(distributionWhere).not.toHaveProperty("recipient")
  })
})
