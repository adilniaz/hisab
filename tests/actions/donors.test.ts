import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({ db: { donor: { create: vi.fn() } } }))
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi.fn(),
  canModify: vi.fn(),
  donorFilter: vi.fn().mockReturnValue({}),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { db } from "@/lib/db"
import { requireAuth, canModify } from "@/lib/permissions"
import { createDonor } from "@/app/(dashboard)/donors/actions"
import { mkSession } from "@/tests/helpers/session"

const validInput = { name: "Test Donor", isAnonymous: false, isRecurring: false }

describe("createDonor — canModify enforcement", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects a VIEWER session before touching the database", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("VIEWER", "ALL"))
    vi.mocked(canModify).mockReturnValue(false)
    await expect(createDonor(validInput)).rejects.toThrow("Unauthorized")
    expect(db.donor.create).not.toHaveBeenCalled()
  })

  it("allows an ADMIN session", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("ADMIN", "ALL"))
    vi.mocked(canModify).mockReturnValue(true)
    await expect(createDonor(validInput)).resolves.not.toThrow()
    expect(db.donor.create).toHaveBeenCalled()
  })
})
