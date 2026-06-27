import { getDonations } from "./actions"
import { DonationTable } from "@/components/donations/donation-table"
import { Topbar } from "@/components/layout/topbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { requireSession, canWrite } from "@/lib/permissions"

export default async function DonationsPage() {
  const session = await requireSession()
  const donations = await getDonations()
  return (
    <>
      <Topbar title="Donations" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          {canWrite(session) && (
            <Link href="/donations/new">
              <Button size="sm">Record Donation</Button>
            </Link>
          )}
        </div>
        <DonationTable donations={donations} />
      </div>
    </>
  )
}
