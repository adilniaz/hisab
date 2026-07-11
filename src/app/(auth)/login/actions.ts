"use server";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export async function loginAction(email: string, password: string) {
  // Keyed by email, not client IP: this app has no reverse proxy in front
  // to strip client-supplied headers, so x-forwarded-for is attacker-controlled
  // and unsuitable as a rate-limit key. authorize() in lib/auth.ts enforces
  // the same account-scoped limit as the hard security boundary; this check
  // just returns a friendlier error before hitting the credentials provider.
  const key = `login:${email}`;
  if (!checkRateLimit(key)) {
    return { error: "Too many login attempts. Please wait 15 minutes and try again." };
  }
  try {
    await signIn("credentials", { email, password, redirectTo: "/overview" });
    resetRateLimit(key);
  } catch (error) {
    if (error instanceof AuthError) return { error: "Invalid email or password" };
    throw error;
  }
}
