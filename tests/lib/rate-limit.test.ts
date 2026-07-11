import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("allows up to 5 attempts then denies the 6th", () => {
    const key = `test-key-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key)).toBe(true);
    }
    expect(checkRateLimit(key)).toBe(false);
  });

  it("resetRateLimit clears the counter for that key", () => {
    const key = `test-key-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(key);
    expect(checkRateLimit(key)).toBe(false);
    resetRateLimit(key);
    expect(checkRateLimit(key)).toBe(true);
  });

  it("treats an expired window as a fresh start", () => {
    const key = `test-key-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(key);
    expect(checkRateLimit(key)).toBe(false);
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(checkRateLimit(key)).toBe(true);
  });

  it("keys are independent of each other", () => {
    const keyA = `test-key-a-${Math.random()}`;
    const keyB = `test-key-b-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(keyA);
    expect(checkRateLimit(keyA)).toBe(false);
    expect(checkRateLimit(keyB)).toBe(true);
  });
});
