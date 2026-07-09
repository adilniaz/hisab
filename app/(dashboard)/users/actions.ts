"use server"
import { db } from "@/lib/db"
import { requireAuth } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { hash } from "bcryptjs"
import { z } from "zod"

const UserSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Minimum 8 characters").optional(),
  role: z.enum(["ADMIN", "DATA_ENTRY", "VIEWER"]),
  scopeType: z.enum(["ALL", "RESTRICTED"]),
})

export async function createUser(data: z.infer<typeof UserSchema>) {
  await requireAuth({ roles: ['ADMIN'] })
  const parsed = UserSchema.parse(data)
  if (!parsed.password) throw new Error("Password required for new users")
  const passwordHash = await hash(parsed.password, 12)
  await db.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      passwordHash,
      role: parsed.role,
      scopeType: parsed.scopeType,
    },
  })
  revalidatePath("/users")
}

export async function updateUser(
  id: string,
  data: Omit<z.infer<typeof UserSchema>, "password"> & { password?: string }
) {
  await requireAuth({ roles: ['ADMIN'] })
  const updateData: Record<string, unknown> = {
    name: data.name,
    email: data.email,
    role: data.role,
    scopeType: data.scopeType,
  }
  if (data.password) updateData.passwordHash = await hash(data.password, 12)
  await db.user.update({ where: { id }, data: updateData })
  revalidatePath("/users")
  revalidatePath(`/users/${id}`)
}

export async function setUserScope(userId: string, donorIds: string[], recipientIds: string[]) {
  await requireAuth({ roles: ['ADMIN'] })
  await db.userScope.deleteMany({ where: { userId } })
  const rows = [
    ...donorIds.map((donorId) => ({ userId, donorId })),
    ...recipientIds.map((recipientId) => ({ userId, recipientId })),
  ]
  if (rows.length) await db.userScope.createMany({ data: rows })
  revalidatePath(`/users/${userId}`)
}

export async function getUsers() {
  await requireAuth({ roles: ['ADMIN'] })
  return db.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { userScopes: true } } },
  })
}

export async function getUserWithScope(id: string) {
  await requireAuth({ roles: ['ADMIN'] })
  return db.user.findUnique({
    where: { id },
    include: {
      userScopes: {
        include: {
          donor: { select: { id: true, name: true, isAnonymous: true } },
          recipient: { select: { id: true, name: true } },
        },
      },
    },
  })
}
