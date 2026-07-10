import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({ db: { donation: { create: vi.fn() } } }))
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi.fn(),
  canModify: vi.fn(),
  donorFilter: vi.fn().mockReturnValue({}),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { db } from "@/lib/db"
import { requireAuth, canModify } from "@/lib/permissions"
import { createDonation } from "@/app/(dashboard)/donations/actions"
import { mkSession } from "@/tests/helpers/session"

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
}

describe("createDonation — canModify enforcement", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects a VIEWER session before touching the database", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("VIEWER", "ALL"))
    vi.mocked(canModify).mockReturnValue(false)
    await expect(createDonation(validInput)).rejects.toThrow("Unauthorized")
    expect(db.donation.create).not.toHaveBeenCalled()
  })

  it("allows a DATA_ENTRY session", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("DATA_ENTRY", "ALL"))
    vi.mocked(canModify).mockReturnValue(true)
    await expect(createDonation(validInput)).resolves.not.toThrow()
    expect(db.donation.create).toHaveBeenCalled()
  })
})
