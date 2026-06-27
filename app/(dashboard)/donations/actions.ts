"use server"
import { db } from "@/lib/db"
import { requireSession, canWrite, donorFilter } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const DonationSchema = z.object({
  donorId: z.string().uuid().optional().or(z.literal("")),
  isAnonymous: z.boolean().default(false),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date required"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "EASYPAISA", "JAZZCASH", "OTHER"]),
  paymentContext: z.enum(["ZAKAT", "SADAQAH", "GENERAL", "OTHER"]),
  type: z.enum(["POOLED", "DESIGNATED"]),
  designatedRecipientId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
})

export async function createDonation(data: z.infer<typeof DonationSchema>) {
  const session = await requireSession()
  if (!canWrite(session)) throw new Error("Unauthorized")
  const parsed = DonationSchema.parse(data)
  await db.donation.create({
    data: {
      donorId: parsed.isAnonymous || !parsed.donorId ? null : parsed.donorId,
      amount: parsed.amount,
      date: new Date(parsed.date),
      paymentMethod: parsed.paymentMethod,
      paymentContext: parsed.paymentContext,
      type: parsed.type,
      designatedRecipientId: parsed.type === "DESIGNATED" && parsed.designatedRecipientId ? parsed.designatedRecipientId : null,
      notes: parsed.notes,
      recordedById: session.user.id,
    },
  })
  revalidatePath("/donations")
  revalidatePath("/overview")
}

export async function getDonations() {
  const session = await requireSession()
  const scopeWhere = donorFilter(session)
  return db.donation.findMany({
    where: Object.keys(scopeWhere).length ? { donor: scopeWhere } : undefined,
    include: {
      donor: true,
      designatedRecipient: { select: { name: true } },
      recordedBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  })
}

export async function getDonation(id: string) {
  await requireSession()
  return db.donation.findUnique({
    where: { id },
    include: {
      donor: true,
      designatedRecipient: true,
      distributions: { include: { recipient: true } },
      recordedBy: { select: { name: true } },
    },
  })
}

export async function getDonorsForPicker() {
  const session = await requireSession()
  const scopeWhere = donorFilter(session)
  return db.donor.findMany({
    where: scopeWhere,
    select: { id: true, name: true, isAnonymous: true },
    orderBy: { name: "asc" },
  })
}
