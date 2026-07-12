"use server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canModify, donorFilter } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const PAGE_SIZE = 25;
// getDonorsForPicker feeds a plain <select> (see donations/new, [id]/edit pages),
// not a paginated table — bounded rather than paged.
const PICKER_LIMIT = 500;

const DonationSchema = z.object({
  donorId: z.string().uuid().optional().or(z.literal("")),
  isAnonymous: z.boolean().default(false),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date required"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "EASYPAISA", "JAZZCASH", "OTHER"]),
  paymentContext: z.enum(["ZAKAT", "SADAQAH", "GENERAL", "OTHER"]),
  type: z.enum(["POOLED", "DESIGNATED"]),
  designatedRecipientId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function createDonation(data: z.infer<typeof DonationSchema>) {
  const session = await requireAuth();
  if (!canModify(session)) throw new Error("Unauthorized");
  const parsed = DonationSchema.parse(data);
  await prisma.donation.create({
    data: {
      donorId: parsed.isAnonymous || !parsed.donorId ? null : parsed.donorId,
      amount: parsed.amount,
      date: new Date(parsed.date),
      paymentMethod: parsed.paymentMethod,
      paymentContext: parsed.paymentContext,
      type: parsed.type,
      designatedRecipientId:
        parsed.type === "DESIGNATED" && parsed.designatedRecipientId
          ? parsed.designatedRecipientId
          : null,
      notes: parsed.notes,
      recordedById: session.user.id,
    },
  });
  revalidatePath("/donations");
  revalidatePath("/overview");
}

export async function updateDonation(id: string, data: z.infer<typeof DonationSchema>) {
  await requireAuth({ roles: ["ADMIN"] });
  const parsed = DonationSchema.parse(data);
  await prisma.donation.update({
    where: { id },
    data: {
      donorId: parsed.isAnonymous || !parsed.donorId ? null : parsed.donorId,
      amount: parsed.amount,
      date: new Date(parsed.date),
      paymentMethod: parsed.paymentMethod,
      paymentContext: parsed.paymentContext,
      type: parsed.type,
      designatedRecipientId:
        parsed.type === "DESIGNATED" && parsed.designatedRecipientId
          ? parsed.designatedRecipientId
          : null,
      notes: parsed.notes,
    },
  });
  revalidatePath("/donations");
  revalidatePath(`/donations/${id}`);
  revalidatePath("/overview");
}

export async function deleteDonation(id: string) {
  await requireAuth({ roles: ["ADMIN"] });
  await prisma.donation.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/donations");
  revalidatePath("/overview");
}

export async function getDonations(
  params: { page?: number; q?: string; from?: string; to?: string } = {},
) {
  const session = await requireAuth();
  const scopeWhere = donorFilter(session);
  const page = params.page ?? 1;
  const donorWhere = {
    ...scopeWhere,
    ...(params.q ? { name: { contains: params.q, mode: "insensitive" as const } } : {}),
  };
  const where = {
    deletedAt: null,
    ...(Object.keys(donorWhere).length ? { donor: donorWhere } : {}),
    ...(params.from || params.to
      ? {
          date: {
            ...(params.from ? { gte: new Date(params.from) } : {}),
            ...(params.to ? { lte: new Date(params.to) } : {}),
          },
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      include: {
        donor: true,
        designatedRecipient: { select: { name: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.donation.count({ where }),
  ]);
  return { items, total, page, pageSize: PAGE_SIZE };
}

export async function getDonation(id: string) {
  const session = await requireAuth();
  const scopeWhere = donorFilter(session);
  return prisma.donation.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(Object.keys(scopeWhere).length ? { donor: scopeWhere } : {}),
    },
    include: {
      donor: true,
      designatedRecipient: true,
      distributions: { where: { deletedAt: null }, include: { recipient: true } },
      recordedBy: { select: { name: true } },
    },
  });
}

export async function getDonorsForPicker() {
  const session = await requireAuth();
  const scopeWhere = donorFilter(session);
  return prisma.donor.findMany({
    where: { deletedAt: null, ...scopeWhere },
    select: { id: true, name: true, isAnonymous: true },
    orderBy: { name: "asc" },
    take: PICKER_LIMIT,
  });
}
