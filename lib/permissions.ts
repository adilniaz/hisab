import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { Session } from "next-auth"
import type { Prisma } from "@prisma/client"

export async function requireAuth(opts?: { roles?: string[] }): Promise<Session> {
  const session = await auth()
  if (!session) redirect("/login")
  if (opts?.roles && opts.roles.length > 0 && !opts.roles.includes(session.user.role)) {
    redirect("/overview")
  }
  return session
}

export function canModify(session: Session): boolean {
  return session.user.role === "ADMIN" || session.user.role === "DATA_ENTRY"
}

export function donorFilter(session: Session): Prisma.DonorWhereInput {
  if (session.user.scopeType === "ALL") return {}
  return { userScopes: { some: { userId: session.user.id } } }
}

export function recipientFilter(session: Session): Prisma.RecipientWhereInput {
  if (session.user.scopeType === "ALL") return {}
  return { userScopes: { some: { userId: session.user.id } } }
}
