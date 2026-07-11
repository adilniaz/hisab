"use server";
import { prisma } from "@/lib/prisma";
import { requireAuth, canModify, donorFilter } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const PAGE_SIZE = 25;

const DonorSchema = z.object({
  name: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  isRecurring: z.boolean().default(false),
  notes: z.string().optional(),
});

export async function createDonor(data: z.infer<typeof DonorSchema>) {
  const session = await requireAuth();
  if (!canModify(session)) throw new Error("Unauthorized");
  const parsed = DonorSchema.parse(data);
  await prisma.donor.create({ data: { ...parsed, email: parsed.email || null } });
  revalidatePath("/donors");
}

export async function updateDonor(id: string, data: z.infer<typeof DonorSchema>) {
  const session = await requireAuth();
  if (!canModify(session)) throw new Error("Unauthorized");
  const parsed = DonorSchema.parse(data);
  await prisma.donor.update({ where: { id }, data: { ...parsed, email: parsed.email || null } });
  revalidatePath("/donors");
  revalidatePath(`/donors/${id}`);
}

export async function deleteDonor(id: string) {
  await requireAuth({ roles: ["ADMIN"] });
  await prisma.donor.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/donors");
}

export async function getDonors(params: { page?: number; q?: string } = {}) {
  const session = await requireAuth();
  const scopeWhere = donorFilter(session);
  const page = params.page ?? 1;
  const where = {
    deletedAt: null,
    ...scopeWhere,
    ...(params.q ? { name: { contains: params.q, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.donor.findMany({
      where,
      include: { _count: { select: { donations: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.donor.count({ where }),
  ]);
  return { items, total, page, pageSize: PAGE_SIZE };
}

export async function getDonor(id: string) {
  const session = await requireAuth();
  const scopeWhere = donorFilter(session);
  return prisma.donor.findFirst({
    where: { id, deletedAt: null, ...scopeWhere },
    include: {
      donations: {
        where: { deletedAt: null },
        orderBy: { date: "desc" },
        include: { recordedBy: { select: { name: true } } },
      },
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
  });
}
