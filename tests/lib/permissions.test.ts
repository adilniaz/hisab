import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))

import { canModify, donorFilter, recipientFilter } from "@/lib/permissions"
import type { Session } from "next-auth"

function mkSession(role: string, scopeType: string): Session {
  return {
    user: { id: "u1", name: "T", email: "t@t.com", role, scopeType } as any,
    expires: "2099-01-01",
  }
}

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
