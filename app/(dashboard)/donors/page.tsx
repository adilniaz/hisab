import { getDonors } from "./actions"
import { DonorTable } from "@/components/donors/donor-table"
import { Topbar } from "@/components/layout/topbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { requireSession, canWrite } from "@/lib/permissions"

export default async function DonorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const session = await requireSession()
  const { q } = await searchParams
  const donors = await getDonors(q)
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
          {canWrite(session) && (
            <Link href="/donors/new">
              <Button size="sm">Add Donor</Button>
            </Link>
          )}
        </div>
        <DonorTable donors={donors} />
      </div>
    </>
  )
}
