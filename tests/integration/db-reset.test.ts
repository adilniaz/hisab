import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../helpers/db";

describe("resetDb", () => {
  beforeEach(resetDb);

  it("clears all users between tests", async () => {
    await prisma.user.create({
      data: {
        name: "Test Admin",
        email: "a@example.com",
        passwordHash: "x",
        role: "ADMIN",
        scopeType: "ALL",
      },
    });
    expect(await prisma.user.count()).toBe(1);

    await resetDb();

    expect(await prisma.user.count()).toBe(0);
  });

  it("refuses to run against a non-test database URL", async () => {
    const original = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://hisab:hisab@localhost:5432/hisab";
    await expect(resetDb()).rejects.toThrow(/refused to run/);
    process.env.DATABASE_URL = original;
  });
});
