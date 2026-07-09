import { redirect } from "next/navigation"
import { requireAuth, canModify, recipientFilter } from "@/lib/permissions"
import { createDistribution } from "../actions"
import { DistributionForm } from "@/components/distributions/distribution-form"
import { Topbar } from "@/components/layout/topbar"
import { db } from "@/lib/db"

export default async function NewDistributionPage() {
  const session = await requireAuth()
  if (!canModify(session)) redirect("/distributions")
  const scopeWhere = recipientFilter(session)
  const recipients = await db.recipient.findMany({
    where: { isActive: true, ...scopeWhere },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
  return (
    <>
      <Topbar title="Record Distribution" />
      <div className="p-6">
        <DistributionForm onSubmit={createDistribution} recipients={recipients} />
      </div>
    </>
  )
}
