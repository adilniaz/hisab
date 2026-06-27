"use server"
import { db } from "@/lib/db"
import { requireSession, requireAdmin, canWrite, donorFilter } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const PAGE_SIZE = 25

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

export async function deleteDonor(id: string) {
  await requireAdmin()
  await db.donor.update({ where: { id }, data: { deletedAt: new Date() } })
  revalidatePath("/donors")
}

export async function getDonors(params: { page?: number; q?: string } = {}) {
  const session = await requireSession()
  const scopeWhere = donorFilter(session)
  const page = params.page ?? 1
  const where = {
    deletedAt: null,
    ...scopeWhere,
    ...(params.q ? { name: { contains: params.q, mode: "insensitive" as const } } : {}),
  }
  const [items, total] = await Promise.all([
    db.donor.findMany({
      where,
      include: { _count: { select: { donations: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.donor.count({ where }),
  ])
  return { items, total, page, pageSize: PAGE_SIZE }
}

export async function getDonor(id: string) {
  const session = await requireSession()
  const scopeWhere = donorFilter(session)
  return db.donor.findFirst({
    where: { id, deletedAt: null, ...scopeWhere },
    include: {
      donations: {
        where: { deletedAt: null },
        orderBy: { date: "desc" },
        include: { recordedBy: { select: { name: true } } },
      },
    },
  })
}

export async function getDonorsForPicker() {
  const session = await requireSession()
  const scopeWhere = donorFilter(session)
  return db.donor.findMany({
    where: { deletedAt: null, ...scopeWhere },
    select: { id: true, name: true, isAnonymous: true },
    orderBy: { name: "asc" },
  })
}
