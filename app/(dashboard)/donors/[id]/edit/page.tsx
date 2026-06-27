import { notFound, redirect } from "next/navigation"
import { getDonor, updateDonor } from "../../actions"
import { DonorForm } from "@/components/donors/donor-form"
import { Topbar } from "@/components/layout/topbar"
import { requireSession, canWrite } from "@/lib/permissions"

export default async function DonorEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [donor, session] = await Promise.all([getDonor(id), requireSession()])
  if (!donor) notFound()
  if (!canWrite(session)) redirect(`/donors/${id}`)

  return (
    <>
      <Topbar title="Edit Donor" />
      <div className="p-6">
        <DonorForm
          onSubmit={(data) => updateDonor(id, data)}
          defaultValues={{
            name: donor.name ?? undefined,
            isAnonymous: donor.isAnonymous,
            phone: donor.phone ?? undefined,
            email: donor.email ?? undefined,
            address: donor.address ?? undefined,
            isRecurring: donor.isRecurring,
            notes: donor.notes ?? undefined,
          }}
        />
      </div>
    </>
  )
}
