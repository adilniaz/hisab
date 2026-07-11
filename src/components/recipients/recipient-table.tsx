import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Recipient } from "@prisma/client";

type Row = Recipient & { _count: { distributions: number } };

export function RecipientTable({ recipients }: { recipients: Row[] }) {
  if (recipients.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No recipients found.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="pb-2 font-medium">Name</th>
          <th className="pb-2 font-medium">Category</th>
          <th className="pb-2 font-medium">Distributions</th>
          <th className="pb-2 font-medium">Status</th>
        </tr>
      </thead>
      <tbody>
        {recipients.map((r) => (
          <tr key={r.id} className="border-b border-border hover:bg-accent/50">
            <td className="py-2">
              <Link href={`/recipients/${r.id}`} className="hover:underline font-medium">
                {r.name}
              </Link>
            </td>
            <td className="py-2">
              <Badge variant="outline">{r.category}</Badge>
            </td>
            <td className="py-2">{r._count.distributions}</td>
            <td className="py-2">
              {r.isActive ? (
                <Badge variant="secondary">Active</Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
