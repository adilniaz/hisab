import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { Session } from "next-auth"
import type { Prisma } from "@prisma/client"

export async function requireSession(): Promise<Session> {
  const session = await auth()
  if (!session) redirect("/login")
  return session
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession()
  if (session.user.role !== "ADMIN") redirect("/overview")
  return session
}

export function canWrite(session: Session): boolean {
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
