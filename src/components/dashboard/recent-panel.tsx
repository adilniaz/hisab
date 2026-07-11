import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export interface RecentItem {
  id: string;
  label: string;
  meta: string;
  amount: number;
  tag: string;
  direction: "in" | "out";
}

interface RecentPanelProps {
  title: string;
  items: RecentItem[];
  viewAllHref: string;
}

export function RecentPanel({ title, items, viewAllHref }: RecentPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Link href={viewAllHref} className="text-xs text-muted-foreground hover:text-foreground">
          View all →
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 && <p className="p-4 text-xs text-muted-foreground">No records yet.</p>}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-4 py-2 border-t border-border text-sm"
          >
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.meta}</p>
            </div>
            <div className="text-right">
              <p
                className={`font-semibold ${item.direction === "in" ? "text-green-400" : "text-red-400"}`}
              >
                {item.direction === "in" ? "+" : "−"}PKR {item.amount.toLocaleString()}
              </p>
              <Badge variant="outline" className="text-[10px] mt-0.5">
                {item.tag}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
