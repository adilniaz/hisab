"use server";

import { requireAuth } from "@/lib/permissions";
import { getPoolBalance, getDesignatedUnspent } from "@/lib/balance";
import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const session = await requireAuth();

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
    prisma.donation.aggregate({ _sum: { amount: true }, where: { deletedAt: null } }),
    prisma.distribution.aggregate({ _sum: { amount: true }, where: { deletedAt: null } }),
    getPoolBalance(),
    getDesignatedUnspent(),
    prisma.donation.findMany({
      take: 5,
      orderBy: { date: "desc" },
      where: { deletedAt: null },
      include: { donor: true },
    }),
    prisma.distribution.findMany({
      take: 5,
      orderBy: { date: "desc" },
      where: { deletedAt: null },
      include: { recipient: true },
    }),
    prisma.donation.findMany({
      where: { date: { gte: sixMonthsAgo }, deletedAt: null },
      select: { date: true, amount: true },
    }),
    prisma.distribution.findMany({
      where: { date: { gte: sixMonthsAgo }, deletedAt: null },
      select: { date: true, amount: true },
    }),
    prisma.donation.findMany({
      where: {
        paymentContext: "ZAKAT",
        deletedAt: null,
        date: { lte: fortyDaysAgo },
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
