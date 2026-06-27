import { requireAdmin } from "@/lib/permissions"
import { getUserWithScope, updateUser } from "../actions"
import { UserForm } from "@/components/users/user-form"
import { Topbar } from "@/components/layout/topbar"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const [user, allDonors, allRecipients] = await Promise.all([
    getUserWithScope(id),
    db.donor.findMany({
      select: { id: true, name: true, isAnonymous: true },
      orderBy: { name: "asc" },
    }),
    db.recipient.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])
  if (!user) notFound()

  const assignedDonorIds = user.userScopes
    .filter((s) => s.donorId)
    .map((s) => s.donorId!)
  const assignedRecipientIds = user.userScopes
    .filter((s) => s.recipientId)
    .map((s) => s.recipientId!)

  return (
    <>
      <Topbar title={`Edit: ${user.name}`} />
      <div className="p-6">
        <UserForm
          onSubmit={(data) => updateUser(id, data)}
          defaultValues={{
            name: user.name,
            email: user.email,
            role: user.role,
            scopeType: user.scopeType,
          }}
          userId={id}
          allDonors={allDonors}
          allRecipients={allRecipients}
          assignedDonorIds={assignedDonorIds}
          assignedRecipientIds={assignedRecipientIds}
        />
      </div>
    </>
  )
}
