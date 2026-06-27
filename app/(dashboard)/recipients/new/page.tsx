import { redirect } from "next/navigation"
import { requireSession, canWrite } from "@/lib/permissions"
import { createRecipient } from "../actions"
import { RecipientForm } from "@/components/recipients/recipient-form"
import { Topbar } from "@/components/layout/topbar"

export default async function NewRecipientPage() {
  const session = await requireSession()
  if (!canWrite(session)) redirect("/recipients")
  return (
    <>
      <Topbar title="Add Recipient" />
      <div className="p-6">
        <RecipientForm onSubmit={createRecipient} />
      </div>
    </>
  )
}
