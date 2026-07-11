import { notFound } from "next/navigation"
import { getDistribution, deleteDistribution } from "../actions"
import { requireAuth } from "@/lib/permissions"
import { Topbar } from "@/components/layout/topbar"
import { Badge } from "@/components/ui/badge"
import { DeleteButton } from "@/components/ui/delete-button"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function DistributionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [distribution, session] = await Promise.all([getDistribution(id), requireAuth()])
  if (!distribution) notFound()
  const isAdmin = session.user.role === "ADMIN"

  return (
    <>
      <Topbar title="Distribution Detail" />
      <div className="p-6 space-y-6">
        {isAdmin && (
          <div className="flex gap-2">
            <Link href={`/distributions/${id}/edit`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Edit
            </Link>
            <DeleteButton
              action={() => deleteDistribution(id)}
              noun="distribution"
              redirectTo="/distributions"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm max-w-lg">
          <div>
            <span className="text-muted-foreground">Recipient:</span>{" "}
            <Link href={`/recipients/${distribution.recipientId}`} className="hover:underline">
              {distribution.recipient.name}
            </Link>
          </div>
          <div>
            <span className="text-muted-foreground">Amount:</span>{" "}
            <span className="text-red-400 font-bold">PKR {Number(distribution.amount).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Date:</span>{" "}
            {new Date(distribution.date).toLocaleDateString()}
          </div>
          <div>
            <span className="text-muted-foreground">Purpose:</span> {distribution.purpose}
          </div>
          <div>
            <span className="text-muted-foreground">Source:</span>{" "}
            {distribution.donation
              ? <Badge variant="outline">{distribution.donation.paymentContext} — {distribution.donation.donor?.name ?? "Anon"}</Badge>
              : "General pool"}
          </div>
          <div>
            <span className="text-muted-foreground">Recorded by:</span>{" "}
            {distribution.recordedBy.name}
          </div>
          {distribution.notes && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Notes:</span> {distribution.notes}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
