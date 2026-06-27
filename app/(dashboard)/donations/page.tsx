import { getDonations } from "./actions"
import { DonationTable } from "@/components/donations/donation-table"
import { Topbar } from "@/components/layout/topbar"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import Link from "next/link"
import { requireSession, canWrite } from "@/lib/permissions"

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; from?: string; to?: string }>
}) {
  const session = await requireSession()
  const { q, page: pageStr, from, to } = await searchParams
  const page = Number(pageStr ?? "1")
  const { items, total, pageSize } = await getDonations({ q, page, from, to })
  return (
    <>
      <Topbar title="Donations" />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <form method="get" className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search donor…"
              className="border border-border rounded px-3 py-1.5 text-sm bg-background"
            />
            <input
              name="from"
              type="date"
              defaultValue={from}
              className="border border-border rounded px-3 py-1.5 text-sm bg-background"
            />
            <input
              name="to"
              type="date"
              defaultValue={to}
              className="border border-border rounded px-3 py-1.5 text-sm bg-background"
            />
            <Button size="sm" variant="outline" type="submit">Filter</Button>
          </form>
          {canWrite(session) && (
            <Link href="/donations/new">
              <Button size="sm">Record Donation</Button>
            </Link>
          )}
        </div>
        <DonationTable donations={items} />
        <Pagination page={page} total={total} pageSize={pageSize} basePath="/donations" params={{ q, from, to }} />
      </div>
    </>
  )
}
