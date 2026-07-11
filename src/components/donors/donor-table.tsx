import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { Donor } from "@prisma/client"

type DonorWithCount = Donor & { _count: { donations: number } }

export function DonorTable({ donors }: { donors: DonorWithCount[] }) {
  if (donors.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No donors found.</p>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="pb-2 font-medium">Name</th>
          <th className="pb-2 font-medium">Phone</th>
          <th className="pb-2 font-medium">Donations</th>
          <th className="pb-2 font-medium">Tags</th>
        </tr>
      </thead>
      <tbody>
        {donors.map((d) => (
          <tr key={d.id} className="border-b border-border hover:bg-accent/50">
            <td className="py-2">
              <Link href={`/donors/${d.id}`} className="hover:underline font-medium">
                {d.isAnonymous ? "Anonymous" : (d.name ?? "—")}
              </Link>
            </td>
            <td className="py-2 text-muted-foreground">{d.phone ?? "—"}</td>
            <td className="py-2">{d._count.donations}</td>
            <td className="py-2 space-x-1">
              {d.isRecurring && <Badge variant="secondary">Recurring</Badge>}
              {d.isAnonymous && <Badge variant="outline">Anonymous</Badge>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
