import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { donor: { create: vi.fn(), findMany: vi.fn() } },
}));
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi.fn(),
  canModify: vi.fn(),
  donorFilter: vi.fn().mockReturnValue({}),
  assertDonorInScope: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { requireAuth, canModify } from "@/lib/permissions";
import { createDonor } from "@/app/(dashboard)/donors/actions";
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
