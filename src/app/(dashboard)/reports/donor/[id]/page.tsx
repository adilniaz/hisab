import { getDonorStatement } from "../../actions";
import { Topbar } from "@/components/layout/topbar";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function DonorStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const donor = await getDonorStatement(id).catch(() => null);
  if (!donor) notFound();

  const totalDonated = donor.donations.reduce((s, d) => s + Number(d.amount), 0);

  return (
    <>
      <Topbar title={`Statement: ${donor.name ?? "Anonymous"}`} />
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{donor.name ?? "Anonymous Donor"}</h1>
            <p className="text-sm text-muted-foreground">
              Total donated: PKR {totalDonated.toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/reports/donor/${id}/pdf`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Export PDF
            </Link>
            <Link
              href={`/reports/donor/${id}/excel`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Export Excel
            </Link>
          </div>
        </div>

        {donor.donations.map((donation) => {
          const distributed = donation.distributions.reduce((s, d) => s + Number(d.amount), 0);
          return (
            <div key={donation.id} className="border border-border rounded-lg overflow-hidden">
              <div className="bg-card px-4 py-3 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-green-400">
                    PKR {Number(donation.amount).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-sm ml-3">
                    {new Date(donation.date).toLocaleDateString()} · {donation.paymentContext} ·{" "}
                    {donation.type}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Distributed: PKR {distributed.toLocaleString()}
                </span>
              </div>
              {donation.distributions.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-border text-left text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Recipient</th>
                      <th className="px-4 py-2 font-medium">Amount</th>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donation.distributions.map((d) => (
                      <tr key={d.id} className="border-t border-border">
                        <td className="px-4 py-2">{d.recipient.name}</td>
                        <td className="px-4 py-2 text-red-400">
                          PKR {Number(d.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-2">{new Date(d.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-muted-foreground">{d.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {donation.distributions.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted-foreground border-t border-border">
                  No distributions linked to this donation yet.
                </p>
              )}
            </div>
          );
        })}

        {donor.donations.length === 0 && (
          <p className="text-sm text-muted-foreground">No donations recorded for this donor.</p>
        )}
      </div>
    </>
  );
}
