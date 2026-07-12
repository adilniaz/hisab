import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userScope: { deleteMany: vi.fn(), createMany: vi.fn() },
    user: { findMany: vi.fn(), count: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi.fn().mockResolvedValue({ user: { id: "u1", role: "ADMIN", scopeType: "ALL" } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { setUserScope, getUsers } from "@/app/(dashboard)/users/actions";

describe("setUserScope — atomicity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("wraps the delete and recreate in a single transaction", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([]);
    await setUserScope("user-1", ["donor-1"], ["recipient-1"]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = vi.mocked(prisma.$transaction).mock.calls[0]![0] as unknown as unknown[];
    expect(ops).toHaveLength(2);
    expect(prisma.userScope.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(prisma.userScope.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "user-1", donorId: "donor-1" },
        { userId: "user-1", recipientId: "recipient-1" },
      ],
    });
  });

  it("still deletes existing scope when the new scope is empty, without a dangling createMany call", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([]);
    await setUserScope("user-1", [], []);
    const ops = vi.mocked(prisma.$transaction).mock.calls[0]![0] as unknown as unknown[];
    expect(ops).toHaveLength(1);
    expect(prisma.userScope.createMany).not.toHaveBeenCalled();
  });

  it("propagates a transaction failure instead of silently leaving partial state", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("write conflict"));
    await expect(setUserScope("user-1", ["donor-1"], [])).rejects.toThrow("write conflict");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe("getUsers — pagination", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests the second page with a skip offset matching pageSize", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.count).mockResolvedValue(30);
    const result = await getUsers({ page: 2 });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 25, take: 25 }),
    );
    expect(result).toEqual({ items: [], total: 30, page: 2, pageSize: 25 });
  });

  it("defaults to page 1 when no page is given", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    await getUsers();
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
  });
});
