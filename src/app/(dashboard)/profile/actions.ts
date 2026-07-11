"use server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"
import { hash, compare } from "bcryptjs"
import { z } from "zod"

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string().min(8, "Minimum 8 characters"),
})

export async function changePassword(data: z.infer<typeof ChangePasswordSchema>) {
  const session = await requireAuth()
  const parsed = ChangePasswordSchema.parse(data)
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } })
  const valid = await compare(parsed.currentPassword, user.passwordHash)
  if (!valid) return { error: "Current password is incorrect" }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await hash(parsed.newPassword, 12) },
  })
  return { success: true }
}
