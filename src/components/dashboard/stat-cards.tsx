import { Card, CardContent } from "@/components/ui/card";

function fmt(n: number) {
  return new Intl.NumberFormat("en-PK").format(Math.round(n));
}

interface StatCardsProps {
  totalReceived: number;
  totalDistributed: number;
  poolBalance: number;
  designatedUnspent: number;
}

export function StatCards({
  totalReceived,
  totalDistributed,
  poolBalance,
  designatedUnspent,
}: StatCardsProps) {
  const cards = [
    { label: "Total Received", value: fmt(totalReceived), color: "text-green-400" },
    { label: "Total Distributed", value: fmt(totalDistributed), color: "text-red-400" },
    { label: "Pool Balance", value: fmt(poolBalance), color: "text-blue-400" },
    { label: "Designated Unspent", value: fmt(designatedUnspent), color: "text-yellow-400" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>PKR {c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
