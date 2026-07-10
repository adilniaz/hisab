"use server"
import { db } from "@/lib/db"
import { requireAuth, canModify, recipientFilter } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import type { Prisma } from "@prisma/client"

const PAGE_SIZE = 25

const DistributionSchema = z.object({
  recipientId: z.string().uuid(),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date required"),
  purpose: z.string().min(1, "Purpose required"),
  donationId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
})

async function assertWithinBalance(
  tx: Prisma.TransactionClient,
  donationId: string | undefined,
  amount: number,
  excludeDistributionId?: string
) {
  if (donationId) {
    const donation = await tx.donation.findUniqueOrThrow({
      where: { id: donationId },
      include: {
        distributions: {
          where: { deletedAt: null, ...(excludeDistributionId ? { id: { not: excludeDistributionId } } : {}) },
          select: { amount: true },
        },
      },
    })
    const spent = donation.distributions.reduce((s, d) => s + Number(d.amount), 0)
    const remaining = Math.max(0, Number(donation.amount) - spent)
    if (amount > remaining) {
      throw new Error(`Amount PKR ${amount} exceeds remaining balance of PKR ${remaining} on this donation`)
    }
    return
  }

  const [pooled, distributed] = await Promise.all([
    tx.donation.aggregate({ _sum: { amount: true }, where: { type: "POOLED", deletedAt: null } }),
    tx.distribution.aggregate({
      _sum: { amount: true },
      where: {
        donationId: null,
        deletedAt: null,
        ...(excludeDistributionId ? { id: { not: excludeDistributionId } } : {}),
      },
    }),
  ])
  const remaining = Number(pooled._sum.amount ?? 0) - Number(distributed._sum.amount ?? 0)
  if (amount > remaining) {
    throw new Error(`Amount PKR ${amount} exceeds remaining pool balance of PKR ${remaining}`)
  }
}

export async function createDistribution(data: z.infer<typeof DistributionSchema>) {
  const session = await requireAuth()
  if (!canModify(session)) throw new Error("Unauthorized")
  const parsed = DistributionSchema.parse(data)
  const donationId = parsed.donationId || undefined

  await db.$transaction(
    async (tx) => {
      await assertWithinBalance(tx, donationId, parsed.amount)
      await tx.distribution.create({
        data: {
          recipientId: parsed.recipientId,
          amount: parsed.amount,
          date: new Date(parsed.date),
          purpose: parsed.purpose,
          donationId: donationId ?? null,
          notes: parsed.notes,
          recordedById: session.user.id,
        },
      })
    },
    { isolationLevel: "Serializable" }
  )
  revalidatePath("/distributions")
  revalidatePath("/overview")
}

export async function updateDistribution(id: string, data: z.infer<typeof DistributionSchema>) {
  await requireAuth({ roles: ['ADMIN'] })
  const parsed = DistributionSchema.parse(data)
  const donationId = parsed.donationId || undefined

  await db.$transaction(
    async (tx) => {
      await assertWithinBalance(tx, donationId, parsed.amount, id)
      await tx.distribution.update({
        where: { id },
        data: {
          recipientId: parsed.recipientId,
          amount: parsed.amount,
          date: new Date(parsed.date),
          purpose: parsed.purpose,
          donationId: donationId ?? null,
          notes: parsed.notes,
        },
      })
    },
    { isolationLevel: "Serializable" }
  )
  revalidatePath("/distributions")
  revalidatePath("/overview")
}

export async function deleteDistribution(id: string) {
  await requireAuth({ roles: ['ADMIN'] })
  await db.distribution.update({ where: { id }, data: { deletedAt: new Date() } })
  revalidatePath("/distributions")
  revalidatePath("/overview")
}

export async function getDistributions(params: { page?: number; q?: string } = {}) {
  const session = await requireAuth()
  const scopeWhere = recipientFilter(session)
  const page = params.page ?? 1
  const recipientFilter2 = {
    ...scopeWhere,
    ...(params.q ? { name: { contains: params.q, mode: "insensitive" as const } } : {}),
  }
  const where = {
    deletedAt: null,
    ...(Object.keys(recipientFilter2).length ? { recipient: recipientFilter2 } : {}),
  }
  const [items, total] = await Promise.all([
    db.distribution.findMany({
      where,
      include: {
        recipient: true,
        donation: { select: { paymentContext: true, donor: { select: { name: true } } } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.distribution.count({ where }),
  ])
  return { items, total, page, pageSize: PAGE_SIZE }
}

export async function getDistribution(id: string) {
  const session = await requireAuth()
  const scopeWhere = recipientFilter(session)
  return db.distribution.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(Object.keys(scopeWhere).length ? { recipient: scopeWhere } : {}),
    },
    include: {
      recipient: true,
      donation: { select: { id: true, paymentContext: true, donor: { select: { name: true } } } },
      recordedBy: { select: { name: true } },
    },
  })
}

export async function getDesignatedDonationsForRecipient(recipientId: string) {
  await requireAuth()
  const donations = await db.donation.findMany({
    where: { type: "DESIGNATED", designatedRecipientId: recipientId, deletedAt: null },
    include: { distributions: { where: { deletedAt: null }, select: { amount: true } } },
  })
  return donations
    .map((d) => {
      const spent = d.distributions.reduce((s, dist) => s + Number(dist.amount), 0)
      const remaining = Math.max(0, Number(d.amount) - spent)
      return { id: d.id, amount: Number(d.amount), remaining, date: d.date }
    })
    .filter((d) => d.remaining > 0)
}
