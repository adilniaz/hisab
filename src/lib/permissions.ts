import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import type { Prisma } from "@prisma/client";

// Server Action / server component guard — redirects if unauthenticated.
export async function requireAuth(opts?: { roles?: string[] }): Promise<Session> {
  const session = await auth();
  if (!session) redirect("/login");
  if (opts?.roles && opts.roles.length > 0 && !opts.roles.includes(session.user.role)) {
    redirect("/overview");
  }
  return session;
}

// API route guard — returns a 401/403 NextResponse if unauthorized, or null
// if the request may proceed.
// Usage: const unauthorized = await requireAuthApi(opts); if (unauthorized) return unauthorized;
export async function requireAuthApi(opts?: { roles?: string[] }): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (opts?.roles && opts.roles.length > 0 && !opts.roles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function canModify(session: Session): boolean {
  return session.user.role === "ADMIN" || session.user.role === "DATA_ENTRY";
}

export function donorFilter(session: Session): Prisma.DonorWhereInput {
  if (session.user.scopeType === "ALL") return {};
  return { userScopes: { some: { userId: session.user.id } } };
}

export function recipientFilter(session: Session): Prisma.RecipientWhereInput {
  if (session.user.scopeType === "ALL") return {};
  return { userScopes: { some: { userId: session.user.id } } };
}

// Scope filters lifted to the Donation/Distribution level (via their donor /
// recipient relations). For RESTRICTED users this also excludes donor-less
// (anonymous) donations — those belong to no one's scope.
export function donationFilter(session: Session): Prisma.DonationWhereInput {
  if (session.user.scopeType === "ALL") return {};
  return { donor: { userScopes: { some: { userId: session.user.id } } } };
}

export function distributionFilter(session: Session): Prisma.DistributionWhereInput {
  if (session.user.scopeType === "ALL") return {};
  return { recipient: { userScopes: { some: { userId: session.user.id } } } };
}

// Write-side scope guards. Scope filtering applies to writes as well as
// reads: a RESTRICTED user must not create or modify records attached to a
// donor/recipient outside their scope (doing so would both leak the target's
// existence and bypass the read scoping). No-ops for ALL-scope users, so the
// common case costs no extra query.
export async function assertDonorInScope(session: Session, donorId: string): Promise<void> {
  if (session.user.scopeType === "ALL") return;
  const scope = await prisma.userScope.findFirst({
    where: { userId: session.user.id, donorId },
    select: { id: true },
  });
  if (!scope) throw new Error("Unauthorized");
}

export async function assertRecipientInScope(
  session: Session,
  recipientId: string,
): Promise<void> {
  if (session.user.scopeType === "ALL") return;
  const scope = await prisma.userScope.findFirst({
    where: { userId: session.user.id, recipientId },
    select: { id: true },
  });
  if (!scope) throw new Error("Unauthorized");
}
