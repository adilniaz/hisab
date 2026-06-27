"use server"
import { db } from "@/lib/db"
import { requireSession, canWrite, recipientFilter } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { z } from "zod"

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

export async function getRecipients(search?: string) {
  const session = await requireSession()
  const scopeWhere = recipientFilter(session)
  return db.recipient.findMany({
    where: {
      ...scopeWhere,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: { _count: { select: { distributions: true } } },
    orderBy: { name: "asc" },
  })
}

export async function getRecipient(id: string) {
  const session = await requireSession()
  const scopeWhere = recipientFilter(session)
  return db.recipient.findFirst({
    where: { id, ...scopeWhere },
    include: {
      distributions: {
        orderBy: { date: "desc" },
        include: {
          donation: { select: { paymentContext: true, donor: { select: { name: true } } } },
          recordedBy: { select: { name: true } },
        },
      },
    },
  })
}
