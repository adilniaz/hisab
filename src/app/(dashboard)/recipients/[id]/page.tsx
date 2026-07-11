import { notFound } from "next/navigation";
import { getRecipient, deleteRecipient } from "../actions";
import { Topbar } from "@/components/layout/topbar";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/ui/delete-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { requireAuth, canModify } from "@/lib/permissions";

export default async function RecipientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [recipient, session] = await Promise.all([getRecipient(id), requireAuth()]);
  if (!recipient) notFound();

  const total = recipient.distributions.reduce((s, d) => s + Number(d.amount), 0);
  const isAdmin = session.user.role === "ADMIN";

  return (
    <>
      <Topbar title={recipient.name} />
      <div className="p-6 space-y-6">
        {canModify(session) && (
          <div className="flex gap-2">
            <Link
              href={`/recipients/${id}/edit`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Edit
            </Link>
            {isAdmin && (
              <DeleteButton
                action={() => deleteRecipient(id)}
                noun="recipient"
                redirectTo="/recipients"
              />
            )}
          </div>
        )}
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Category:</span>{" "}
            <Badge variant="outline">{recipient.category}</Badge>
          </p>
          {recipient.phone && (
            <p>
              <span className="text-muted-foreground">Phone:</span> {recipient.phone}
            </p>
          )}
          {recipient.address && (
            <p>
              <span className="text-muted-foreground">Address:</span> {recipient.address}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Total received:</span>{" "}
            <span className="text-red-400 font-bold">PKR {total.toLocaleString()}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Status:</span>{" "}
            {recipient.isActive ? "Active" : "Inactive"}
          </p>
          {recipient.notes && (
            <p>
              <span className="text-muted-foreground">Notes:</span> {recipient.notes}
            </p>
          )}
        </div>

        <div>
          <h2 className="font-semibold mb-3">Distribution History</h2>
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
      </div>
    </>
  );
}
