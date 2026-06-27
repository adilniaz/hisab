"use server"
import { db } from "@/lib/db"
import { requireSession, canWrite, donorFilter } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const DonorSchema = z.object({
  name: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  isRecurring: z.boolean().default(false),
  notes: z.string().optional(),
})

export async function createDonor(data: z.infer<typeof DonorSchema>) {
  const session = await requireSession()
  if (!canWrite(session)) throw new Error("Unauthorized")
  const parsed = DonorSchema.parse(data)
  await db.donor.create({ data: { ...parsed, email: parsed.email || null } })
  revalidatePath("/donors")
}

export async function updateDonor(id: string, data: z.infer<typeof DonorSchema>) {
  const session = await requireSession()
  if (!canWrite(session)) throw new Error("Unauthorized")
  const parsed = DonorSchema.parse(data)
  await db.donor.update({ where: { id }, data: { ...parsed, email: parsed.email || null } })
  revalidatePath("/donors")
  revalidatePath(`/donors/${id}`)
}

export async function getDonors(search?: string) {
  const session = await requireSession()
  const scopeWhere = donorFilter(session)
  return db.donor.findMany({
    where: {
      ...scopeWhere,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: { _count: { select: { donations: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function getDonor(id: string) {
  const session = await requireSession()
  const scopeWhere = donorFilter(session)
  return db.donor.findFirst({
    where: { id, ...scopeWhere },
    include: {
      donations: {
        orderBy: { date: "desc" },
        include: { recordedBy: { select: { name: true } } },
      },
    },
  })
}
