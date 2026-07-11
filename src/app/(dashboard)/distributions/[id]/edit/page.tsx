import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/permissions"
import { getDistribution, updateDistribution, getDesignatedDonationsForRecipient } from "../../actions"
import { DistributionForm } from "@/components/distributions/distribution-form"
import { Topbar } from "@/components/layout/topbar"
import { prisma } from "@/lib/prisma"

export default async function EditDistributionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth({ roles: ['ADMIN'] })
  const { id } = await params
  const [distribution, recipients] = await Promise.all([
    getDistribution(id),
    prisma.recipient.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])
  if (!distribution) notFound()

  const defaultDesignatedDonations = distribution.recipientId
    ? await getDesignatedDonationsForRecipient(distribution.recipientId)
    : []

  return (
    <>
      <Topbar title="Edit Distribution" />
      <div className="p-6">
        <DistributionForm
          onSubmit={(data) => updateDistribution(id, data)}
          recipients={recipients}
          defaultValues={{
            recipientId: distribution.recipientId,
            amount: Number(distribution.amount),
            date: new Date(distribution.date).toISOString().slice(0, 10),
            purpose: distribution.purpose,
            donationId: distribution.donationId ?? undefined,
            notes: distribution.notes ?? undefined,
          }}
          defaultDesignatedDonations={defaultDesignatedDonations}
        />
      </div>
    </>
  )
}
