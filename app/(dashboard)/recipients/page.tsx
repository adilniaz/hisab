import { getRecipients } from "./actions"
import { RecipientTable } from "@/components/recipients/recipient-table"
import { Topbar } from "@/components/layout/topbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { requireSession, canWrite } from "@/lib/permissions"

export default async function RecipientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const session = await requireSession()
  const { q } = await searchParams
  const recipients = await getRecipients(q)
  return (
    <>
      <Topbar title="Recipients" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <form method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search recipients…"
              className="border border-border rounded px-3 py-1.5 text-sm bg-background"
            />
          </form>
          {canWrite(session) && (
            <Link href="/recipients/new">
              <Button size="sm">Add Recipient</Button>
            </Link>
          )}
        </div>
        <RecipientTable recipients={recipients} />
      </div>
    </>
  )
}
