import { getDashboardData } from "./actions";
import { StatCards } from "@/components/dashboard/stat-cards";
import { RecentPanel } from "@/components/dashboard/recent-panel";
import { MonthlyChart, type MonthData } from "@/components/dashboard/monthly-chart";
import { Topbar } from "@/components/layout/topbar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default async function OverviewPage() {
  const {
    session,
    totalRcv,
    totalDst,
    pool,
    desig,
    donations,
    distributions,
    recentDonations,
    recentDistributions,
    pendingZakat,
  } = await getDashboardData();

  const now = new Date();
  const monthData: MonthData[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const received = recentDonations
      .filter((x) => {
        const xd = new Date(x.date);
        return xd.getFullYear() === d.getFullYear() && xd.getMonth() === d.getMonth();
      })
      .reduce((s, x) => s + Number(x.amount), 0);
    const distributed = recentDistributions
      .filter((x) => {
        const xd = new Date(x.date);
        return xd.getFullYear() === d.getFullYear() && xd.getMonth() === d.getMonth();
      })
      .reduce((s, x) => s + Number(x.amount), 0);
    return { month: MONTH_LABELS[d.getMonth()], received, distributed };
  });

  const zakatOverdue = pendingZakat.filter((d) => {
    const spent = d.distributions.reduce((s, x) => s + Number(x.amount), 0);
    return Number(d.amount) - spent > 0;
  });

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="p-6 space-y-6">
        {zakatOverdue.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-sm text-yellow-400">
            ⚠ {zakatOverdue.length} Zakat donation{zakatOverdue.length > 1 ? "s" : ""} received over
            40 days ago still have undistributed funds. Zakat should be distributed promptly.
          </div>
        )}
        <StatCards
          totalReceived={Number(totalRcv._sum.amount ?? 0)}
          totalDistributed={Number(totalDst._sum.amount ?? 0)}
          poolBalance={pool}
          designatedUnspent={desig}
        />
        <div>
          <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
            Last 6 Months
          </h2>
          <MonthlyChart data={monthData} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentPanel
            title="Recent Donations"
            viewAllHref="/donations"
            items={donations.map((d) => ({
              id: d.id,
              label: d.donor?.name ?? "Anonymous",
              meta: `${new Date(d.date).toLocaleDateString()} · ${d.paymentMethod.replace(/_/g, " ")}`,
              amount: Number(d.amount),
              tag: d.paymentContext,
              direction: "in",
            }))}
          />
          <RecentPanel
            title="Recent Distributions"
            viewAllHref="/distributions"
            items={distributions.map((d) => ({
              id: d.id,
              label: d.recipient.name,
              meta: `${new Date(d.date).toLocaleDateString()} · ${d.purpose.slice(0, 30)}`,
              amount: Number(d.amount),
              tag: d.recipient.category,
              direction: "out",
            }))}
          />
        </div>
        {session.user.role === "ADMIN" && (
          <div>
            <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
              Export Data
            </h2>
            <div className="flex flex-wrap gap-2">
              {(["donations", "distributions", "donors", "recipients"] as const).map((t) => (
                <a
                  key={t}
                  href={`/api/export?type=${t}`}
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                >
                  ↓ {t.charAt(0).toUpperCase() + t.slice(1)} CSV
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
