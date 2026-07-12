export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export function isLockedOut(user: { lockedUntil: Date | null }): boolean {
  return !!user.lockedUntil && user.lockedUntil > new Date();
}

/**
 * Given the failed-attempt count before this failure, returns the update
 * to persist — locking the account once MAX_FAILED_ATTEMPTS is crossed.
 */
export function recordFailedAttempt(failedAttemptsBefore: number): {
  failedAttempts: number;
  lockedUntil: Date | null;
} {
  const failedAttempts = failedAttemptsBefore + 1;
  return {
    failedAttempts,
    lockedUntil:
      failedAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
  };
}

export function resetLockout(): { failedAttempts: number; lockedUntil: null } {
  return { failedAttempts: 0, lockedUntil: null };
}
