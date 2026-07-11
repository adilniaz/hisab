import type { NextRequest } from "next/server";

// In-memory sliding-window rate limiter.
//
// LIMITATION: state is per-process and lost on restart. Acceptable for
// single-instance deployments; replace with a Redis-backed or
// database-backed limiter for multi-instance production.
const store = new Map<string, { count: number; resetAt: number }>();

export function getClientIP(req: Pick<NextRequest, "headers">): string {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  return forwarded.split(",").pop()?.trim() || req.headers.get("x-real-ip") || "unknown";
}

// Returns true if the request is allowed, false if rate limited.
// Defaults: 5 attempts per 15-minute window.
export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    // Prune expired entries periodically to prevent unbounded memory growth
    if (store.size > 5_000) {
      for (const [k, v] of store) if (v.resetAt < now) store.delete(k);
    }
    return true;
  }

  if (entry.count >= maxAttempts) return false;

  entry.count++;
  return true;
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}
