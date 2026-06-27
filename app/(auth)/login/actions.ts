"use server"
import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit"
import { headers } from "next/headers"

export async function loginAction(email: string, password: string) {
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown"
  const key = `login:${ip}`
  const { allowed } = checkRateLimit(key)
  if (!allowed) {
    return { error: "Too many login attempts. Please wait 15 minutes and try again." }
  }
  try {
    await signIn("credentials", { email, password, redirectTo: "/overview" })
    resetRateLimit(key)
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password" }
    throw error
  }
}
