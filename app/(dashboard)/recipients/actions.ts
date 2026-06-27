"use server"
import { db } from "@/lib/db"
import { requireSession, requireAdmin, canWrite, recipientFilter } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const PAGE_SIZE = 25

const RecipientSchema = z.object({
  name: z.string().min(1, "Name required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  category: z.enum(["MEDICAL", "FOOD", "EDUCATION", "RENT", "EMERGENCY", "OTHER"]),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})

export async function createRecipient(data: z.infer<typeof RecipientSchema>) {
  const session = await requireSession()
  if (!canWrite(session)) throw new Error("Unauthorized")
  await db.recipient.create({ data: RecipientSchema.parse(data) })
  revalidatePath("/recipients")
}

export async function updateRecipient(id: string, data: z.infer<typeof RecipientSchema>) {
  const session = await requireSession()
  if (!canWrite(session)) throw new Error("Unauthorized")
  await db.recipient.update({ where: { id }, data: RecipientSchema.parse(data) })
  revalidatePath("/recipients")
  revalidatePath(`/recipients/${id}`)
}

export async function deleteRecipient(id: string) {
  await requireAdmin()
  await db.recipient.update({ where: { id }, data: { deletedAt: new Date() } })
  revalidatePath("/recipients")
}

export async function getRecipients(params: { page?: number; q?: string } = {}) {
  const session = await requireSession()
  const scopeWhere = recipientFilter(session)
  const page = params.page ?? 1
  const where = {
    deletedAt: null,
    ...scopeWhere,
    ...(params.q ? { name: { contains: params.q, mode: "insensitive" as const } } : {}),
  }
  const [items, total] = await Promise.all([
    db.recipient.findMany({
      where,
      include: { _count: { select: { distributions: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.recipient.count({ where }),
  ])
  return { items, total, page, pageSize: PAGE_SIZE }
}

export async function getRecipient(id: string) {
  const session = await requireSession()
  const scopeWhere = recipientFilter(session)
  return db.recipient.findFirst({
    where: { id, deletedAt: null, ...scopeWhere },
    include: {
      distributions: {
        where: { deletedAt: null },
        orderBy: { date: "desc" },
        include: {
          donation: { select: { paymentContext: true, donor: { select: { name: true } } } },
          recordedBy: { select: { name: true } },
        },
      },
    },
  })
}
