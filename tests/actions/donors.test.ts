import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { donor: { create: vi.fn(), findMany: vi.fn() } },
}));
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi.fn(),
  canModify: vi.fn(),
  donorFilter: vi.fn().mockReturnValue({}),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { requireAuth, canModify } from "@/lib/permissions";
import { createDonor, getDonorsForPicker } from "@/app/(dashboard)/donors/actions";
import { mkSession } from "../helpers/session";

const validInput = { name: "Test Donor", isAnonymous: false, isRecurring: false };

describe("createDonor — canModify enforcement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a VIEWER session before touching the database", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("VIEWER", "ALL"));
    vi.mocked(canModify).mockReturnValue(false);
    await expect(createDonor(validInput)).rejects.toThrow("Unauthorized");
    expect(prisma.donor.create).not.toHaveBeenCalled();
  });

  it("allows an ADMIN session", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("ADMIN", "ALL"));
    vi.mocked(canModify).mockReturnValue(true);
    await expect(createDonor(validInput)).resolves.not.toThrow();
    expect(prisma.donor.create).toHaveBeenCalled();
  });
});

describe("getDonorsForPicker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bounds the query with a take limit instead of loading every donor", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("ADMIN", "ALL"));
    vi.mocked(prisma.donor.findMany).mockResolvedValue([]);
    await getDonorsForPicker();
    expect(prisma.donor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: expect.any(Number) }),
    );
  });
});
