import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { recipient: { create: vi.fn() } } }));
vi.mock("@/lib/permissions", () => ({
  requireAuth: vi.fn(),
  canModify: vi.fn(),
  recipientFilter: vi.fn().mockReturnValue({}),
  assertRecipientInScope: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { requireAuth, canModify } from "@/lib/permissions";
import { createRecipient } from "@/app/(dashboard)/recipients/actions";
import { mkSession } from "../helpers/session";

const validInput = { name: "Test Recipient", category: "OTHER" as const, isActive: true };

describe("createRecipient — canModify enforcement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a VIEWER session before touching the database", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("VIEWER", "ALL"));
    vi.mocked(canModify).mockReturnValue(false);
    await expect(createRecipient(validInput)).rejects.toThrow("Unauthorized");
    expect(prisma.recipient.create).not.toHaveBeenCalled();
  });

  it("allows a DATA_ENTRY session", async () => {
    vi.mocked(requireAuth).mockResolvedValue(mkSession("DATA_ENTRY", "ALL"));
    vi.mocked(canModify).mockReturnValue(true);
    await expect(createRecipient(validInput)).resolves.not.toThrow();
    expect(prisma.recipient.create).toHaveBeenCalled();
  });
});
