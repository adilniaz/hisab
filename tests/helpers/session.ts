import type { Session } from "next-auth"

export function mkSession(role: string, scopeType: string): Session {
  return {
    user: { id: "u1", name: "T", email: "t@t.com", role, scopeType } as any,
    expires: "2099-01-01",
  }
}
