import { requireSession } from "@/lib/permissions"
import { getPoolBalance, getDesignatedUnspent } from "@/lib/balance"
import { db } from "@/lib/db"
import { StatCards } from "@/components/dashboard/stat-cards"
import { RecentPanel } from "@/components/dashboard/recent-panel"
import { Topbar } from "@/components/layout/topbar"

export default async function OverviewPage() {
  await requireSession()

  const [totalRcv, totalDst, pool, desig, donations, distributions] = await Promise.all([
    db.donation.aggregate({ _sum: { amount: true } }),
    db.distribution.aggregate({ _sum: { amount: true } }),
    getPoolBalance(),
    getDesignatedUnspent(),
    db.donation.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: { donor: true },
    }),
    db.distribution.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: { recipient: true },
    }),
  ])

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="p-6 space-y-6">
        <StatCards
          totalReceived={Number(totalRcv._sum.amount ?? 0)}
          totalDistributed={Number(totalDst._sum.amount ?? 0)}
          poolBalance={pool}
          designatedUnspent={desig}
        />
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
      </div>
    </>
  )
}
