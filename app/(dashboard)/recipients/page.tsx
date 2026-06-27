import { getRecipients } from "./actions"
import { RecipientTable } from "@/components/recipients/recipient-table"
import { Topbar } from "@/components/layout/topbar"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import Link from "next/link"
import { requireSession, canWrite } from "@/lib/permissions"

export default async function RecipientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await requireSession()
  const { q, page: pageStr } = await searchParams
  const page = Number(pageStr ?? "1")
  const { items, total, pageSize } = await getRecipients({ q, page })
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
        <RecipientTable recipients={items} />
        <Pagination page={page} total={total} pageSize={pageSize} basePath="/recipients" params={{ q }} />
      </div>
    </>
  )
}
