"use server"
import { db } from "@/lib/db"
import { requireSession, canWrite, recipientFilter } from "@/lib/permissions"
import { getDonationRemainingBalance } from "@/lib/balance"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const DistributionSchema = z.object({
  recipientId: z.string().uuid(),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date required"),
  purpose: z.string().min(1, "Purpose required"),
  donationId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
})

export async function createDistribution(data: z.infer<typeof DistributionSchema>) {
  const session = await requireSession()
  if (!canWrite(session)) throw new Error("Unauthorized")
  const parsed = DistributionSchema.parse(data)

  const donationId = parsed.donationId || undefined

  if (donationId) {
    const remaining = await getDonationRemainingBalance(donationId)
    if (parsed.amount > remaining) {
      throw new Error(
        `Amount PKR ${parsed.amount} exceeds remaining balance of PKR ${remaining} on this donation`
      )
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

export async function getDistributions() {
  const session = await requireSession()
  const scopeWhere = recipientFilter(session)
  return db.distribution.findMany({
    where: Object.keys(scopeWhere).length ? { recipient: scopeWhere } : undefined,
    include: {
      recipient: true,
      donation: { select: { paymentContext: true, donor: { select: { name: true } } } },
      recordedBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  })
}

export async function getDesignatedDonationsForRecipient(recipientId: string) {
  await requireSession()
  const donations = await db.donation.findMany({
    where: { type: "DESIGNATED", designatedRecipientId: recipientId },
    include: { distributions: { select: { amount: true } } },
  })
  return donations
    .map((d) => {
      const spent = d.distributions.reduce((s, dist) => s + Number(dist.amount), 0)
      const remaining = Math.max(0, Number(d.amount) - spent)
      return { id: d.id, amount: Number(d.amount), remaining, date: d.date }
    })
    .filter((d) => d.remaining > 0)
}
