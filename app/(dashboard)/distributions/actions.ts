"use server"
import { db } from "@/lib/db"
import { requireAuth, canModify, recipientFilter } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const PAGE_SIZE = 25

const DistributionSchema = z.object({
  recipientId: z.string().uuid(),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date required"),
  purpose: z.string().min(1, "Purpose required"),
  donationId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
})

export async function createDistribution(data: z.infer<typeof DistributionSchema>) {
  const session = await requireAuth()
  if (!canModify(session)) throw new Error("Unauthorized")
  const parsed = DistributionSchema.parse(data)
  const donationId = parsed.donationId || undefined

  if (donationId) {
    const donation = await db.donation.findUniqueOrThrow({
      where: { id: donationId },
      include: { distributions: { where: { deletedAt: null }, select: { amount: true } } },
    })
    const spent = donation.distributions.reduce((s, d) => s + Number(d.amount), 0)
    const remaining = Math.max(0, Number(donation.amount) - spent)
    if (parsed.amount > remaining) {
      throw new Error(`Amount PKR ${parsed.amount} exceeds remaining balance of PKR ${remaining} on this donation`)
    }
  }

  await db.distribution.create({
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
  revalidatePath("/distributions")
  revalidatePath("/overview")
}

export async function updateDistribution(id: string, data: z.infer<typeof DistributionSchema>) {
  await requireAuth({ roles: ['ADMIN'] })
  const parsed = DistributionSchema.parse(data)
  const donationId = parsed.donationId || undefined

  if (donationId) {
    const donation = await db.donation.findUniqueOrThrow({
      where: { id: donationId },
      include: { distributions: { where: { id: { not: id }, deletedAt: null }, select: { amount: true } } },
    })
    const spent = donation.distributions.reduce((s, d) => s + Number(d.amount), 0)
    const remaining = Math.max(0, Number(donation.amount) - spent)
    if (parsed.amount > remaining) {
      throw new Error(`Amount PKR ${parsed.amount} exceeds remaining balance of PKR ${remaining}`)
    }
  }

  await db.distribution.update({
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
  await requireAuth()
  return db.distribution.findFirst({
    where: { id, deletedAt: null },
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
