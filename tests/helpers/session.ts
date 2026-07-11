import type { Session } from "next-auth";

export function mkSession(role: string, scopeType: string): Session {
  return {
    user: {
      id: "u1",
      name: "T",
      email: "t@t.com",
      role,
      scopeType,
      tokenVersion: 0,
    } as unknown as Session["user"],
    expires: "2099-01-01",
  };
}
