import { describe, it, expect, beforeEach, vi } from "vitest";
import { compare } from "bcryptjs";
import type { Session } from "next-auth";

vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return { ...actual, requireAuth: vi.fn() };
});

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { createUser, getUsers, setUserScope, getUserWithScope } from "@/app/(dashboard)/users/actions";
import { resetDb } from "../helpers/db";

function adminSession(id: string): Session {
  return {
    user: {
      id,
      name: "Admin",
      email: "admin@t.com",
      role: "ADMIN",
      scopeType: "ALL",
      tokenVersion: 0,
    } as unknown as Session["user"],
    expires: "2099-01-01",
  };
}

describe("users actions — DB integration", () => {
  let adminId: string;

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();

    const admin = await prisma.user.create({
      data: { name: "Admin", email: "admin@t.com", passwordHash: "x", role: "ADMIN", scopeType: "ALL" },
    });
    adminId = admin.id;
    vi.mocked(requireAuth).mockResolvedValue(adminSession(adminId));
  });

  it("hashes the password before storing it", async () => {
    await createUser({
      name: "New User",
      email: "new@t.com",
      password: "plaintext-password-1",
      role: "VIEWER",
      scopeType: "ALL",
    });

    const created = await prisma.user.findUniqueOrThrow({ where: { email: "new@t.com" } });
    expect(created.passwordHash).not.toBe("plaintext-password-1");
    expect(await compare("plaintext-password-1", created.passwordHash)).toBe(true);
  });

  it("paginates users across pages", async () => {
    for (let i = 0; i < 30; i++) {
      await prisma.user.create({
        data: {
          name: `User ${i}`,
          email: `user${i}@t.com`,
          passwordHash: "x",
          role: "VIEWER",
          scopeType: "ALL",
        },
      });
    }
    // 30 seeded + the admin from beforeEach = 31 total.
    const page1 = await getUsers({ page: 1 });
    expect(page1.items).toHaveLength(25);
    expect(page1.total).toBe(31);

    const page2 = await getUsers({ page: 2 });
    expect(page2.items).toHaveLength(6);
  });

  it("replaces a user's scope rows rather than appending to them", async () => {
    const target = await prisma.user.create({
      data: {
        name: "Scoped",
        email: "scoped@t.com",
        passwordHash: "x",
        role: "DATA_ENTRY",
        scopeType: "RESTRICTED",
      },
    });
    const donorA = await prisma.donor.create({ data: { name: "Donor A" } });
    const donorB = await prisma.donor.create({ data: { name: "Donor B" } });

    await setUserScope(target.id, [donorA.id], []);
    let withScope = await getUserWithScope(target.id);
    expect(withScope?.userScopes).toHaveLength(1);
    expect(withScope?.userScopes[0]?.donorId).toBe(donorA.id);

    await setUserScope(target.id, [donorB.id], []);
    withScope = await getUserWithScope(target.id);
    expect(withScope?.userScopes).toHaveLength(1);
    expect(withScope?.userScopes[0]?.donorId).toBe(donorB.id);
  });
});
