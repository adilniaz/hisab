import { getAuditReport } from "../actions"
import { Topbar } from "@/components/layout/topbar"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const today = new Date().toISOString().slice(0, 10)
  const { from: fromParam, to: toParam } = await searchParams
  const from = fromParam ?? today.slice(0, 7) + "-01"
  const to = toParam ?? today
  const { donations, distributions } = await getAuditReport(from, to)

  const totalIn = donations.reduce((s, d) => s + Number(d.amount), 0)
  const totalOut = distributions.reduce((s, d) => s + Number(d.amount), 0)

  return (
    <>
      <Topbar title="Full Audit" />
      <div className="p-6 space-y-6 max-w-4xl">
        <form method="get" className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">From</label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="border border-border rounded px-3 py-1.5 text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">To</label>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="border border-border rounded px-3 py-1.5 text-sm bg-background"
            />
          </div>
          <Button type="submit" size="sm">Apply</Button>
          <Link
            href={`/reports/audit/pdf?from=${from}&to=${to}`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Export PDF
          </Link>
          <Link
            href={`/reports/audit/excel?from=${from}&to=${to}`}
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Export Excel
          </Link>
        </form>

        <div className="flex gap-6 text-sm flex-wrap">
          <span className="text-green-400 font-bold">Total received: PKR {totalIn.toLocaleString()}</span>
          <span className="text-red-400 font-bold">Total distributed: PKR {totalOut.toLocaleString()}</span>
          <span className="text-blue-400 font-bold">Net: PKR {(totalIn - totalOut).toLocaleString()}</span>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Donations ({donations.length})</h2>
          <table className="w-full text-sm mb-8">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2">Date</th>
                <th className="pb-2">Donor</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Context</th>
                <th className="pb-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id} className="border-b border-border">
                  <td className="py-2">{new Date(d.date).toLocaleDateString()}</td>
                  <td className="py-2">{d.donor?.name ?? "Anonymous"}</td>
                  <td className="py-2 text-green-400 font-semibold">PKR {Number(d.amount).toLocaleString()}</td>
                  <td className="py-2">{d.paymentContext}</td>
                  <td className="py-2">{d.type}</td>
                </tr>
              ))}
              {donations.length === 0 && (
                <tr><td colSpan={5} className="py-3 text-muted-foreground text-xs">No donations in this period.</td></tr>
              )}
            </tbody>
          </table>

          <h2 className="font-semibold mb-3">Distributions ({distributions.length})</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2">Date</th>
                <th className="pb-2">Recipient</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((d) => (
                <tr key={d.id} className="border-b border-border">
                  <td className="py-2">{new Date(d.date).toLocaleDateString()}</td>
                  <td className="py-2">{d.recipient.name}</td>
                  <td className="py-2 text-red-400 font-semibold">PKR {Number(d.amount).toLocaleString()}</td>
                  <td className="py-2">{d.purpose}</td>
                </tr>
              ))}
              {distributions.length === 0 && (
                <tr><td colSpan={4} className="py-3 text-muted-foreground text-xs">No distributions in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
