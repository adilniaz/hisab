import Link from "next/link"
import type { Distribution, Recipient } from "@prisma/client"

type Row = Distribution & {
  recipient: Recipient
  donation: { paymentContext: string; donor: { name: string | null } | null } | null
  recordedBy: { name: string }
}

export function DistributionTable({ distributions }: { distributions: Row[] }) {
  if (distributions.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No distributions yet.</p>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="pb-2 font-medium">Date</th>
          <th className="pb-2 font-medium">Recipient</th>
          <th className="pb-2 font-medium">Amount</th>
          <th className="pb-2 font-medium">Purpose</th>
          <th className="pb-2 font-medium">Source</th>
          <th className="pb-2 font-medium">By</th>
        </tr>
      </thead>
      <tbody>
        {distributions.map((d) => (
          <tr key={d.id} className="border-b border-border hover:bg-accent/50">
            <td className="py-2">{new Date(d.date).toLocaleDateString()}</td>
            <td className="py-2 font-medium">
              <Link href={`/distributions/${d.id}`} className="hover:underline">{d.recipient.name}</Link>
            </td>
            <td className="py-2 text-red-400 font-semibold">
              PKR {Number(d.amount).toLocaleString()}
            </td>
            <td className="py-2">{d.purpose}</td>
            <td className="py-2 text-muted-foreground text-xs">
              {d.donation
                ? `Designated (${d.donation.donor?.name ?? "Anon"})`
                : "Pool"}
            </td>
            <td className="py-2 text-muted-foreground text-xs">{d.recordedBy.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
