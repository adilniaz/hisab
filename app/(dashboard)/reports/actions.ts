"use server"
import { db } from "@/lib/db"
import { requireSession } from "@/lib/permissions"

export async function getDonorStatement(donorId: string) {
  await requireSession()
  return db.donor.findUniqueOrThrow({
    where: { id: donorId },
    include: {
      donations: {
        orderBy: { date: "asc" },
        include: {
          distributions: {
            include: { recipient: { select: { name: true, category: true } } },
          },
        },
      },
    },
  })
}

export async function getRecipientHistory(recipientId: string) {
  await requireSession()
  return db.recipient.findUniqueOrThrow({
    where: { id: recipientId },
    include: {
      distributions: {
        orderBy: { date: "asc" },
        include: {
          donation: { select: { paymentContext: true, donor: { select: { name: true } } } },
          recordedBy: { select: { name: true } },
        },
      },
    },
  })
}

export async function getAuditReport(from: string, to: string) {
  await requireSession()
  const where = { date: { gte: new Date(from), lte: new Date(to) } }
  const [donations, distributions] = await Promise.all([
    db.donation.findMany({ where, include: { donor: true }, orderBy: { date: "asc" } }),
    db.distribution.findMany({ where, include: { recipient: true }, orderBy: { date: "asc" } }),
  ])
  return { donations, distributions, from, to }
}

export async function getAllDonors() {
  await requireSession()
  return db.donor.findMany({
    select: { id: true, name: true, isAnonymous: true },
    orderBy: { name: "asc" },
  })
}

export async function getAllRecipients() {
  await requireSession()
  return db.recipient.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}
