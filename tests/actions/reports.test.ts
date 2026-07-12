import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    donor: { findMany: vi.fn() },
    recipient: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi.fn(),
  donorFilter: vi.fn().mockReturnValue({}),
  recipientFilter: vi.fn().mockReturnValue({}),
}));

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions";
import { getAllDonors, getAllRecipients } from "@/app/(dashboard)/reports/actions";
import { mkSession } from "../helpers/session";

describe("getAllDonors / getAllRecipients — picker bound", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bounds the donor picker query with a take limit", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("ADMIN", "ALL"));
    vi.mocked(prisma.donor.findMany).mockResolvedValue([]);
    await getAllDonors();
    expect(prisma.donor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: expect.any(Number) }),
    );
  });

  it("bounds the recipient picker query with a take limit", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("ADMIN", "ALL"));
    vi.mocked(prisma.recipient.findMany).mockResolvedValue([]);
    await getAllRecipients();
    expect(prisma.recipient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: expect.any(Number) }),
    );
  });
});
