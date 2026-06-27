import { db } from "@/lib/db"

export async function getPoolBalance(): Promise<number> {
  const [pooled, distributed] = await Promise.all([
    db.donation.aggregate({ _sum: { amount: true }, where: { type: "POOLED" } }),
    db.distribution.aggregate({ _sum: { amount: true }, where: { donationId: null } }),
  ])
  return Number(pooled._sum.amount ?? 0) - Number(distributed._sum.amount ?? 0)
}

export async function getDesignatedUnspent(): Promise<number> {
  const donations = await db.donation.findMany({
    where: { type: "DESIGNATED" },
    include: { distributions: { select: { amount: true } } },
  })
  return donations.reduce((sum, d) => {
    const spent = d.distributions.reduce((s, dist) => s + Number(dist.amount), 0)
    return sum + Math.max(0, Number(d.amount) - spent)
  }, 0)
}

export async function getDonationRemainingBalance(donationId: string): Promise<number> {
  const donation = await db.donation.findUniqueOrThrow({
    where: { id: donationId },
    include: { distributions: { select: { amount: true } } },
  })
  const spent = donation.distributions.reduce((s, d) => s + Number(d.amount), 0)
  return Math.max(0, Number(donation.amount) - spent)
}
