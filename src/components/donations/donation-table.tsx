import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { Donation, Donor } from "@prisma/client"

type Row = Donation & {
  donor: Donor | null
  designatedRecipient: { name: string } | null
  recordedBy: { name: string }
}

export function DonationTable({ donations }: { donations: Row[] }) {
  if (donations.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No donations yet.</p>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="pb-2 font-medium">Date</th>
          <th className="pb-2 font-medium">Donor</th>
          <th className="pb-2 font-medium">Amount</th>
          <th className="pb-2 font-medium">Context</th>
          <th className="pb-2 font-medium">Type</th>
          <th className="pb-2 font-medium">Method</th>
        </tr>
      </thead>
      <tbody>
        {donations.map((d) => (
          <tr key={d.id} className="border-b border-border hover:bg-accent/50">
            <td className="py-2">{new Date(d.date).toLocaleDateString()}</td>
            <td className="py-2">
              <Link href={`/donations/${d.id}`} className="hover:underline">
                {d.donor?.name ?? "Anonymous"}
              </Link>
            </td>
            <td className="py-2 text-green-400 font-semibold">
              PKR {Number(d.amount).toLocaleString()}
            </td>
            <td className="py-2">
              <Badge variant="outline">{d.paymentContext}</Badge>
            </td>
            <td className="py-2 text-muted-foreground">
              {d.type === "DESIGNATED"
                ? `Designated → ${d.designatedRecipient?.name ?? "—"}`
                : "Pooled"}
            </td>
            <td className="py-2 text-muted-foreground">
              {d.paymentMethod.replace(/_/g, " ")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
