"use server";

import { requireAuth, donationFilter, distributionFilter } from "@/lib/permissions";
import { getPoolBalance, getDesignatedUnspent } from "@/lib/balance";
import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const session = await requireAuth();

  // RESTRICTED users only see aggregates over their scoped donors/recipients
  // (audit H1: the dashboard previously leaked org-wide totals).
  const donationWhere = donationFilter(session);
  const distributionWhere = distributionFilter(session);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const fortyDaysAgo = new Date();
  fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

  const [
    totalRcv,
    totalDst,
    pool,
    desig,
    donations,
    distributions,
    recentDonations,
    recentDistributions,
    pendingZakat,
  ] = await Promise.all([
    prisma.donation.aggregate({
      _sum: { amount: true },
      where: { deletedAt: null, ...donationWhere },
    }),
    prisma.distribution.aggregate({
      _sum: { amount: true },
      where: { deletedAt: null, ...distributionWhere },
    }),
    getPoolBalance(prisma, undefined, {
      donation: donationWhere,
      distribution: distributionWhere,
    }),
    getDesignatedUnspent(prisma, { donation: donationWhere }),
    prisma.donation.findMany({
      take: 5,
      orderBy: { date: "desc" },
      where: { deletedAt: null, ...donationWhere },
      include: { donor: true },
    }),
    prisma.distribution.findMany({
      take: 5,
      orderBy: { date: "desc" },
      where: { deletedAt: null, ...distributionWhere },
      include: { recipient: true },
    }),
    prisma.donation.findMany({
      where: { date: { gte: sixMonthsAgo }, deletedAt: null, ...donationWhere },
      select: { date: true, amount: true },
    }),
    prisma.distribution.findMany({
      where: { date: { gte: sixMonthsAgo }, deletedAt: null, ...distributionWhere },
      select: { date: true, amount: true },
    }),
    prisma.donation.findMany({
      where: {
        paymentContext: "ZAKAT",
        deletedAt: null,
        date: { lte: fortyDaysAgo },
        ...donationWhere,
      },
      select: {
        id: true,
        amount: true,
        distributions: { where: { deletedAt: null }, select: { amount: true } },
      },
    }),
  ]);

  return {
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
  };
}
