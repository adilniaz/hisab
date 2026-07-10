import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

import { auth } from "@/lib/auth"
import { requireAuth, canModify, donorFilter, recipientFilter } from "@/lib/permissions"
import { mkSession } from "@/tests/helpers/session"

// auth() has overloaded (middleware-style vs. plain) call signatures that
// confuse vi.mocked()'s overload resolution; a single cast here keeps every
// test below free of per-call `any`.
const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

describe("requireAuth", () => {
  beforeEach(() => vi.clearAllMocks())

  it("redirects to /login when there is no session", async () => {
    mockAuth.mockResolvedValue(null)
    await expect(requireAuth()).rejects.toThrow("REDIRECT:/login")
  })

  it("returns the session when no roles are required", async () => {
    const session = mkSession("VIEWER", "ALL")
    mockAuth.mockResolvedValue(session)
    await expect(requireAuth()).resolves.toBe(session)
  })

  it("returns the session when the caller's role is allowed", async () => {
    const session = mkSession("ADMIN", "ALL")
    mockAuth.mockResolvedValue(session)
    await expect(requireAuth({ roles: ["ADMIN"] })).resolves.toBe(session)
  })

  it("redirects to /overview when the caller's role isn't allowed", async () => {
    mockAuth.mockResolvedValue(mkSession("VIEWER", "ALL"))
    await expect(requireAuth({ roles: ["ADMIN"] })).rejects.toThrow("REDIRECT:/overview")
  })
})

describe("canModify", () => {
  it("true for ADMIN", () => expect(canModify(mkSession("ADMIN", "ALL"))).toBe(true))
  it("true for DATA_ENTRY", () => expect(canModify(mkSession("DATA_ENTRY", "ALL"))).toBe(true))
  it("false for VIEWER", () => expect(canModify(mkSession("VIEWER", "ALL"))).toBe(false))
})

describe("donorFilter", () => {
  it("empty for ALL scope", () =>
    expect(donorFilter(mkSession("ADMIN", "ALL"))).toEqual({}))
  it("userScopes filter for RESTRICTED", () =>
    expect(donorFilter(mkSession("DATA_ENTRY", "RESTRICTED"))).toEqual({
      userScopes: { some: { userId: "u1" } },
    }))
})

describe("recipientFilter", () => {
  it("empty for ALL scope", () =>
    expect(recipientFilter(mkSession("ADMIN", "ALL"))).toEqual({}))
  it("userScopes filter for RESTRICTED", () =>
    expect(recipientFilter(mkSession("VIEWER", "RESTRICTED"))).toEqual({
      userScopes: { some: { userId: "u1" } },
    }))
})
