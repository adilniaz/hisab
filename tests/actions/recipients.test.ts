import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({ db: { recipient: { create: vi.fn() } } }))
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi.fn(),
  canModify: vi.fn(),
  recipientFilter: vi.fn().mockReturnValue({}),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { db } from "@/lib/db"
import { requireAuth, canModify } from "@/lib/permissions"
import { createRecipient } from "@/app/(dashboard)/recipients/actions"

const validInput = { name: "Test Recipient", category: "OTHER" as const, isActive: true }

describe("createRecipient — canModify enforcement", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects a VIEWER session before touching the database", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1", role: "VIEWER", scopeType: "ALL" } } as any)
    vi.mocked(canModify).mockReturnValue(false)
    await expect(createRecipient(validInput)).rejects.toThrow("Unauthorized")
    expect(db.recipient.create).not.toHaveBeenCalled()
  })

  it("allows a DATA_ENTRY session", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1", role: "DATA_ENTRY", scopeType: "ALL" } } as any)
    vi.mocked(canModify).mockReturnValue(true)
    vi.mocked(db.recipient.create).mockResolvedValue({} as any)
    await expect(createRecipient(validInput)).resolves.not.toThrow()
    expect(db.recipient.create).toHaveBeenCalled()
  })
})
