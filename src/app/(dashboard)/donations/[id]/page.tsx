import { notFound } from "next/navigation";
import { getDonation } from "../actions";
import { requireAuth } from "@/lib/permissions";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function DonationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [donation, session] = await Promise.all([getDonation(id), requireAuth()]);
  if (!donation) notFound();
  const isAdmin = session.user.role === "ADMIN";

  const distributed = donation.distributions.reduce((s, d) => s + Number(d.amount), 0);
  const remaining = Math.max(0, Number(donation.amount) - distributed);

  return (
    <>
      <Topbar title="Donation Detail" />
      <div className="p-6 space-y-6">
        {isAdmin && (
          <div>
            <Link
              href={`/donations/${id}/edit`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Edit
            </Link>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm max-w-lg">
          <div>
            <span className="text-muted-foreground">Donor:</span>{" "}
            {donation.donor?.name ?? "Anonymous"}
          </div>
          <div>
            <span className="text-muted-foreground">Amount:</span>{" "}
            <span className="text-green-400 font-bold">
              PKR {Number(donation.amount).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Date:</span>{" "}
            {new Date(donation.date).toLocaleDateString()}
          </div>
          <div>
            <span className="text-muted-foreground">Context:</span>{" "}
            <Badge variant="outline">{donation.paymentContext}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Type:</span> {donation.type}
          </div>
          {donation.type === "DESIGNATED" && (
            <div>
              <span className="text-muted-foreground">For:</span>{" "}
              {donation.designatedRecipient?.name ?? "—"}
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Distributed:</span> PKR{" "}
            {distributed.toLocaleString()}
          </div>
          <div>
            <span className="text-muted-foreground">Remaining:</span>{" "}
            <span className={remaining > 0 ? "text-yellow-400" : "text-muted-foreground"}>
              PKR {remaining.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Method:</span>{" "}
            {donation.paymentMethod.replace(/_/g, " ")}
          </div>
          <div>
            <span className="text-muted-foreground">Recorded by:</span> {donation.recordedBy.name}
          </div>
          {donation.notes && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Notes:</span> {donation.notes}
            </div>
          )}
        </div>

        {donation.distributions.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3">Distributions from this donation</h2>
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
                {donation.distributions.map((d) => (
                  <tr key={d.id} className="border-b border-border">
                    <td className="py-2">{new Date(d.date).toLocaleDateString()}</td>
                    <td className="py-2">{d.recipient.name}</td>
                    <td className="py-2 text-red-400">PKR {Number(d.amount).toLocaleString()}</td>
                    <td className="py-2 text-muted-foreground">{d.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
