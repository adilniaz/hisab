// Unauthenticated liveness probe for the Docker healthcheck — no DB, no auth.
export function GET() {
  return Response.json({ ok: true });
}
