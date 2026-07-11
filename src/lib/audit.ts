type AuditEvent =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGIN_RATE_LIMITED"
  | "USER_DEACTIVATED"
  | "USER_REACTIVATED";

interface AuditEntry {
  event: AuditEvent;
  email?: string;
  actor?: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export function logAudit(entry: Omit<AuditEntry, "timestamp">) {
  if (process.env.NODE_ENV === "test") return;
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() });
  process.stderr.write(`[audit] ${line}\n`);
}
