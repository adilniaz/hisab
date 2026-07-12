import { describe, it, expect } from "vitest";
import {
  isLockedOut,
  recordFailedAttempt,
  resetLockout,
  MAX_FAILED_ATTEMPTS,
} from "@/lib/account-lockout";

describe("isLockedOut", () => {
  it("is false when lockedUntil is null", () => {
    expect(isLockedOut({ lockedUntil: null })).toBe(false);
  });

  it("is true when lockedUntil is in the future", () => {
    expect(isLockedOut({ lockedUntil: new Date(Date.now() + 60_000) })).toBe(true);
  });

  it("is false when lockedUntil is in the past", () => {
    expect(isLockedOut({ lockedUntil: new Date(Date.now() - 60_000) })).toBe(false);
  });
});

describe("recordFailedAttempt", () => {
  it("increments failedAttempts without locking below the threshold", () => {
    const result = recordFailedAttempt(0);
    expect(result.failedAttempts).toBe(1);
    expect(result.lockedUntil).toBeNull();
  });

  it("does not lock at MAX_FAILED_ATTEMPTS - 1 prior attempts", () => {
    const result = recordFailedAttempt(MAX_FAILED_ATTEMPTS - 2);
    expect(result.failedAttempts).toBe(MAX_FAILED_ATTEMPTS - 1);
    expect(result.lockedUntil).toBeNull();
  });

  it("locks once the threshold is crossed", () => {
    const before = Date.now();
    const result = recordFailedAttempt(MAX_FAILED_ATTEMPTS - 1);
    expect(result.failedAttempts).toBe(MAX_FAILED_ATTEMPTS);
    expect(result.lockedUntil).not.toBeNull();
    expect(result.lockedUntil!.getTime()).toBeGreaterThan(before);
  });
});

describe("resetLockout", () => {
  it("clears both fields", () => {
    expect(resetLockout()).toEqual({ failedAttempts: 0, lockedUntil: null });
  });
});
