import { getRecipientHistory } from "../../actions";
import { Topbar } from "@/components/layout/topbar";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function RecipientHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipient = await getRecipientHistory(id).catch(() => null);
  if (!recipient) notFound();

  const total = recipient.distributions.reduce((s, d) => s + Number(d.amount), 0);

  return (
    <>
      <Topbar title={`History: ${recipient.name}`} />
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{recipient.name}</h1>
            <p className="text-sm text-muted-foreground">
              Total received: PKR {total.toLocaleString()} · {recipient.category}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/reports/recipient/${id}/pdf`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Export PDF
            </Link>
            <Link
              href={`/reports/recipient/${id}/excel`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Export Excel
            </Link>
          </div>
        </div>

        {recipient.distributions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No distributions recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2">Date</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Purpose</th>
                <th className="pb-2">Source</th>
                <th className="pb-2">Recorded by</th>
              </tr>
            </thead>
            <tbody>
              {recipient.distributions.map((d) => (
                <tr key={d.id} className="border-b border-border">
                  <td className="py-2">{new Date(d.date).toLocaleDateString()}</td>
                  <td className="py-2 text-red-400 font-semibold">
                    PKR {Number(d.amount).toLocaleString()}
                  </td>
                  <td className="py-2">{d.purpose}</td>
                  <td className="py-2 text-muted-foreground text-xs">
                    {d.donation
                      ? `${d.donation.paymentContext} (${d.donation.donor?.name ?? "Anon"})`
                      : "Pool"}
                  </td>
                  <td className="py-2 text-muted-foreground text-xs">{d.recordedBy.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
