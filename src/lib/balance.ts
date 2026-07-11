import { prisma as defaultDb } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

type QueryClient = Pick<PrismaClient, "donation" | "distribution"> | Prisma.TransactionClient;

export async function getPoolBalance(
  client: QueryClient = defaultDb,
  excludeDistributionId?: string,
): Promise<number> {
  const [pooled, distributed] = await Promise.all([
    client.donation.aggregate({
      _sum: { amount: true },
      where: { type: "POOLED", deletedAt: null },
    }),
    client.distribution.aggregate({
      _sum: { amount: true },
      where: {
        donationId: null,
        deletedAt: null,
        ...(excludeDistributionId ? { id: { not: excludeDistributionId } } : {}),
      },
    }),
  ]);
  return Number(pooled._sum.amount ?? 0) - Number(distributed._sum.amount ?? 0);
}

export async function getDesignatedUnspent(client: QueryClient = defaultDb): Promise<number> {
  const donations = await client.donation.findMany({
    where: { type: "DESIGNATED", deletedAt: null },
    select: { id: true, amount: true },
  });
  if (donations.length === 0) return 0;

  const spentByDonation = await client.distribution.groupBy({
    by: ["donationId"],
    where: { donationId: { in: donations.map((d) => d.id) }, deletedAt: null },
    _sum: { amount: true },
  });
  const spentMap = new Map(spentByDonation.map((s) => [s.donationId, Number(s._sum.amount ?? 0)]));

  return donations.reduce(
    (sum, d) => sum + Math.max(0, Number(d.amount) - (spentMap.get(d.id) ?? 0)),
    0,
  );
}

export async function getDonationRemainingBalance(
  donationId: string,
  client: QueryClient = defaultDb,
  excludeDistributionId?: string,
): Promise<number> {
  const donation = await client.donation.findUniqueOrThrow({
    where: { id: donationId },
    include: {
      distributions: {
        where: {
          deletedAt: null,
          ...(excludeDistributionId ? { id: { not: excludeDistributionId } } : {}),
        },
        select: { amount: true },
      },
    },
  });
  const spent = donation.distributions.reduce((s, d) => s + Number(d.amount), 0);
  return Math.max(0, Number(donation.amount) - spent);
}
