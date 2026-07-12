import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Session } from "next-auth";

vi.mock("@/lib/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/permissions")>();
  return { ...actual, requireAuth: vi.fn() };
});

import { GET } from "@/app/api/export/route";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { resetDb } from "../helpers/db";

function adminSession(): Session {
  return {
    user: {
      id: "admin-1",
      name: "Admin",
      email: "admin@t.com",
      role: "ADMIN",
      scopeType: "ALL",
      tokenVersion: 0,
    } as unknown as Session["user"],
    expires: "2099-01-01",
  };
}

function reqFor(type: string) {
  return new NextRequest(`http://localhost/api/export?type=${type}`);
}

describe("GET /api/export — DB integration", () => {
  let adminId: string;

  beforeEach(async () => {
    await resetDb();
    vi.clearAllMocks();
    const admin = await prisma.user.create({
      data: { name: "Admin", email: "admin@t.com", passwordHash: "x", role: "ADMIN", scopeType: "ALL" },
    });
    adminId = admin.id;
    vi.mocked(requireAuth).mockResolvedValue(adminSession());
  });

  it("returns 400 for an unrecognized type", async () => {
    const res = await GET(reqFor("bogus"));
    expect(res.status).toBe(400);
  });

  it("exports only non-deleted donations as CSV", async () => {
    const donor = await prisma.donor.create({ data: { name: "Alice" } });
    await prisma.donation.create({
      data: {
        donorId: donor.id,
        amount: 500,
        date: new Date("2026-01-05"),
        paymentMethod: "CASH",
        paymentContext: "GENERAL",
        type: "POOLED",
        recordedById: adminId,
      },
    });
    await prisma.donation.create({
      data: {
        donorId: donor.id,
        amount: 999,
        date: new Date("2026-01-06"),
        paymentMethod: "CASH",
        paymentContext: "GENERAL",
        type: "POOLED",
        recordedById: adminId,
        deletedAt: new Date(),
      },
    });

    const res = await GET(reqFor("donations"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain('attachment; filename="donations.csv"');

    const csv = await res.text();
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(2); // header + one non-deleted row
    expect(lines[1]).toContain("Alice");
    expect(lines[1]).toContain("500");
  });

  it("neutralizes formula-injection payloads in donor names", async () => {
    await prisma.donor.create({ data: { name: "=cmd|'/c calc'!A1" } });

    const res = await GET(reqFor("donors"));
    const csv = await res.text();
    const dataLine = csv.trim().split("\n")[1];
    // toCsv prefixes a leading apostrophe so spreadsheet apps treat it as text, not a formula.
    expect(dataLine).toContain("'=cmd");
  });

  it("exports distributions and recipients for their respective types", async () => {
    const recipient = await prisma.recipient.create({ data: { name: "Bob", category: "FOOD" } });
    await prisma.distribution.create({
      data: {
        recipientId: recipient.id,
        amount: 200,
        date: new Date("2026-01-10"),
        purpose: "Groceries",
        recordedById: adminId,
      },
    });

    const distRes = await GET(reqFor("distributions"));
    expect(distRes.status).toBe(200);
    const distCsv = await distRes.text();
    expect(distCsv).toContain("Bob");
    expect(distCsv).toContain("Groceries");

    const recipRes = await GET(reqFor("recipients"));
    const recipCsv = await recipRes.text();
    expect(recipCsv).toContain("Bob");
    expect(recipCsv).toContain("FOOD");
  });

  it("propagates a requireAuth rejection (redirect) instead of returning data", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(GET(reqFor("donations"))).rejects.toThrow("NEXT_REDIRECT");
  });
});
