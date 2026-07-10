"use server"
import { db } from "@/lib/db"
import { requireAuth, donorFilter, recipientFilter } from "@/lib/permissions"

export async function getDonorStatement(donorId: string) {
  const session = await requireAuth()
  const scopeWhere = donorFilter(session)
  const donor = await db.donor.findFirst({
    where: { id: donorId, deletedAt: null, ...scopeWhere },
    include: {
      donations: {
        where: { deletedAt: null },
        orderBy: { date: "asc" },
        include: {
          distributions: {
            where: { deletedAt: null },
            include: { recipient: { select: { name: true, category: true } } },
          },
        },
      },
    },
  })
  if (!donor) throw new Error("Donor not found")
  return donor
}

export async function getRecipientHistory(recipientId: string) {
  const session = await requireAuth()
  const scopeWhere = recipientFilter(session)
  const recipient = await db.recipient.findFirst({
    where: { id: recipientId, deletedAt: null, ...scopeWhere },
    include: {
      distributions: {
        where: { deletedAt: null },
        orderBy: { date: "asc" },
        include: {
          donation: { select: { paymentContext: true, donor: { select: { name: true } } } },
          recordedBy: { select: { name: true } },
        },
      },
    },
  })
  if (!recipient) throw new Error("Recipient not found")
  return recipient
}

export async function getAuditReport(from: string, to: string) {
  const session = await requireAuth()
  const donorScope = donorFilter(session)
  const recipientScope = recipientFilter(session)
  const dateWhere = { date: { gte: new Date(from), lte: new Date(to) } }
  const [donations, distributions] = await Promise.all([
    db.donation.findMany({
      where: {
        ...dateWhere,
        deletedAt: null,
        ...(Object.keys(donorScope).length ? { donor: donorScope } : {}),
      },
      include: { donor: true },
      orderBy: { date: "asc" },
    }),
    db.distribution.findMany({
      where: {
        ...dateWhere,
        deletedAt: null,
        ...(Object.keys(recipientScope).length ? { recipient: recipientScope } : {}),
      },
      include: { recipient: true },
      orderBy: { date: "asc" },
    }),
  ])
  return { donations, distributions, from, to }
}

export async function getAllDonors() {
  const session = await requireAuth()
  const scopeWhere = donorFilter(session)
  return db.donor.findMany({
    where: { deletedAt: null, ...scopeWhere },
    select: { id: true, name: true, isAnonymous: true },
    orderBy: { name: "asc" },
  })
}

export async function getAllRecipients() {
  const session = await requireAuth()
  const scopeWhere = recipientFilter(session)
  return db.recipient.findMany({
    where: { isActive: true, deletedAt: null, ...scopeWhere },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}
