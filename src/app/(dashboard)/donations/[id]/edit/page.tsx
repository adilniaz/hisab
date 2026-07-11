import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/permissions"
import { getDonation, getDonorsForPicker, updateDonation } from "../../actions"
import { DonationForm } from "@/components/donations/donation-form"
import { Topbar } from "@/components/layout/topbar"
import { prisma } from "@/lib/prisma"

export default async function EditDonationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth({ roles: ['ADMIN'] })
  const { id } = await params
  const [donation, donors, recipients] = await Promise.all([
    getDonation(id),
    getDonorsForPicker(),
    prisma.recipient.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])
  if (!donation) notFound()

  return (
    <>
      <Topbar title="Edit Donation" />
      <div className="p-6">
        <DonationForm
          onSubmit={(data) => updateDonation(id, data)}
          donors={donors}
          recipients={recipients}
          defaultValues={{
            donorId: donation.donorId ?? "",
            isAnonymous: !donation.donorId,
            amount: Number(donation.amount),
            date: new Date(donation.date).toISOString().slice(0, 10),
            paymentMethod: donation.paymentMethod,
            paymentContext: donation.paymentContext,
            type: donation.type,
            designatedRecipientId: donation.designatedRecipientId ?? "",
            notes: donation.notes ?? "",
          }}
        />
      </div>
    </>
  )
}
