import { notFound } from "next/navigation"
import { getDonor, deleteDonor } from "../actions"
import { Topbar } from "@/components/layout/topbar"
import { Badge } from "@/components/ui/badge"
import { DeleteButton } from "@/components/ui/delete-button"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { requireSession, canWrite } from "@/lib/permissions"

export default async function DonorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [donor, session] = await Promise.all([getDonor(id), requireSession()])
  if (!donor) notFound()

  const total = donor.donations.reduce((s, d) => s + Number(d.amount), 0)
  const isAdmin = session.user.role === "ADMIN"

  return (
    <>
      <Topbar title={donor.isAnonymous ? "Anonymous Donor" : (donor.name ?? "Donor")} />
      <div className="p-6 space-y-6">
        {canWrite(session) && (
          <div className="flex gap-2">
            <Link href={`/donors/${id}/edit`} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              Edit
            </Link>
            {isAdmin && (
              <DeleteButton action={() => deleteDonor(id)} noun="donor" redirectTo="/donors" />
            )}
          </div>
        )}
        <div className="flex gap-6 items-start flex-wrap">
          <div className="space-y-1 text-sm">
            {donor.phone && (
              <p>
                <span className="text-muted-foreground">Phone:</span> {donor.phone}
              </p>
            )}
            {donor.email && (
              <p>
                <span className="text-muted-foreground">Email:</span> {donor.email}
              </p>
            )}
            {donor.address && (
              <p>
                <span className="text-muted-foreground">Address:</span> {donor.address}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Total donated:</span>{" "}
              <span className="text-green-400 font-bold">PKR {total.toLocaleString()}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {donor.isRecurring && <Badge>Recurring</Badge>}
            {donor.isAnonymous && <Badge variant="outline">Anonymous</Badge>}
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Donation History</h2>
          {donor.donations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No donations recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Context</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Method</th>
                  <th className="pb-2">Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {donor.donations.map((d) => (
                  <tr key={d.id} className="border-b border-border">
                    <td className="py-2">{new Date(d.date).toLocaleDateString()}</td>
                    <td className="py-2 text-green-400 font-semibold">
                      PKR {Number(d.amount).toLocaleString()}
                    </td>
                    <td className="py-2">
                      <Badge variant="outline">{d.paymentContext}</Badge>
                    </td>
                    <td className="py-2">{d.type}</td>
                    <td className="py-2 text-muted-foreground">
                      {d.paymentMethod.replace(/_/g, " ")}
                    </td>
                    <td className="py-2 text-muted-foreground text-xs">{d.recordedBy.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
