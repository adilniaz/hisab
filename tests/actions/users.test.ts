import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    userScope: { deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi.fn().mockResolvedValue({ user: { id: "u1", role: "ADMIN", scopeType: "ALL" } }),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { db } from "@/lib/db"
import { setUserScope } from "@/app/(dashboard)/users/actions"

describe("setUserScope — atomicity", () => {
  beforeEach(() => vi.clearAllMocks())

  it("wraps the delete and recreate in a single transaction", async () => {
    vi.mocked(db.$transaction).mockResolvedValue([])
    await setUserScope("user-1", ["donor-1"], ["recipient-1"])
    expect(db.$transaction).toHaveBeenCalledTimes(1)
    const ops = vi.mocked(db.$transaction).mock.calls[0]![0] as unknown as unknown[]
    expect(ops).toHaveLength(2)
    expect(db.userScope.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } })
    expect(db.userScope.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "user-1", donorId: "donor-1" },
        { userId: "user-1", recipientId: "recipient-1" },
      ],
    })
  })

  it("still deletes existing scope when the new scope is empty, without a dangling createMany call", async () => {
    vi.mocked(db.$transaction).mockResolvedValue([])
    await setUserScope("user-1", [], [])
    const ops = vi.mocked(db.$transaction).mock.calls[0]![0] as unknown as unknown[]
    expect(ops).toHaveLength(1)
    expect(db.userScope.createMany).not.toHaveBeenCalled()
  })

  it("propagates a transaction failure instead of silently leaving partial state", async () => {
    vi.mocked(db.$transaction).mockRejectedValue(new Error("write conflict"))
    await expect(setUserScope("user-1", ["donor-1"], [])).rejects.toThrow("write conflict")
    expect(db.$transaction).toHaveBeenCalledTimes(1)
  })
})
