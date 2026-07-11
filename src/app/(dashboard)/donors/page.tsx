import { getDonors } from "./actions"
import { DonorTable } from "@/components/donors/donor-table"
import { Topbar } from "@/components/layout/topbar"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import Link from "next/link"
import { requireAuth, canModify } from "@/lib/permissions"

export default async function DonorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await requireAuth()
  const { q, page: pageStr } = await searchParams
  const page = Number(pageStr ?? "1")
  const { items, total, pageSize } = await getDonors({ q, page })
  return (
    <>
      <Topbar title="Donors" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <form method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search donors…"
              className="border border-border rounded px-3 py-1.5 text-sm bg-background"
            />
          </form>
          {canModify(session) && (
            <Link href="/donors/new">
              <Button size="sm">Add Donor</Button>
            </Link>
          )}
        </div>
        <DonorTable donors={items} />
        <Pagination page={page} total={total} pageSize={pageSize} basePath="/donors" params={{ q }} />
      </div>
    </>
  )
}
