import { getDistributions } from "./actions"
import { DistributionTable } from "@/components/distributions/distribution-table"
import { Topbar } from "@/components/layout/topbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { requireSession, canWrite } from "@/lib/permissions"

export default async function DistributionsPage() {
  const session = await requireSession()
  const distributions = await getDistributions()
  return (
    <>
      <Topbar title="Distributions" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          {canWrite(session) && (
            <Link href="/distributions/new">
              <Button size="sm">Record Distribution</Button>
            </Link>
          )}
        </div>
        <DistributionTable distributions={distributions} />
      </div>
    </>
  )
}
