import { NextRequest, NextResponse } from "next/server";
import {
  requireAuth,
  donationFilter,
  distributionFilter,
  donorFilter,
  recipientFilter,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { toCsv, csvResponse } from "@/lib/export-utils";

export async function GET(req: NextRequest) {
  const session = await requireAuth({ roles: ["ADMIN"] });
  // Full-table CSV exports are expensive — cap per-admin frequency.
  if (!checkRateLimit(`export:${session.user.id}`, 10, 5 * 60_000)) {
    return NextResponse.json({ error: "Too many export requests" }, { status: 429 });
  }
  const type = req.nextUrl.searchParams.get("type") ?? "donations";

  let csv: string;
  let filename: string;

  if (type === "donations") {
    const scopeWhere = donationFilter(session);
    const rows = await prisma.donation.findMany({
      where: { deletedAt: null, ...scopeWhere },
      include: { donor: true, designatedRecipient: true, recordedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    });
    csv = toCsv(
      [
        "Date",
        "Donor",
        "Amount (PKR)",
        "Context",
        "Type",
        "Designated For",
        "Method",
        "Notes",
        "Recorded By",
      ],
      rows.map((r) => [
        new Date(r.date).toISOString().slice(0, 10),
        r.donor?.name ?? "Anonymous",
        Number(r.amount),
        r.paymentContext,
        r.type,
        r.designatedRecipient?.name ?? "",
        r.paymentMethod,
        r.notes ?? "",
        r.recordedBy.name,
      ]),
    );
    filename = "donations.csv";
  } else if (type === "distributions") {
    const scopeWhere = distributionFilter(session);
    const rows = await prisma.distribution.findMany({
      where: { deletedAt: null, ...scopeWhere },
      include: {
        recipient: true,
        donation: { select: { paymentContext: true } },
        recordedBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });
    csv = toCsv(
      ["Date", "Recipient", "Amount (PKR)", "Purpose", "Source", "Notes", "Recorded By"],
      rows.map((r) => [
        new Date(r.date).toISOString().slice(0, 10),
        r.recipient.name,
        Number(r.amount),
        r.purpose,
        r.donation?.paymentContext ?? "Pool",
        r.notes ?? "",
        r.recordedBy.name,
      ]),
    );
    filename = "distributions.csv";
  } else if (type === "donors") {
    const scopeWhere = donorFilter(session);
    const rows = await prisma.donor.findMany({
      where: { deletedAt: null, ...scopeWhere },
      orderBy: { name: "asc" },
    });
    csv = toCsv(
      ["Name", "Anonymous", "Phone", "Email", "Address", "Recurring", "Notes"],
      rows.map((r) => [
        r.name ?? "Anonymous",
        r.isAnonymous ? "Yes" : "No",
        r.phone ?? "",
        r.email ?? "",
        r.address ?? "",
        r.isRecurring ? "Yes" : "No",
        r.notes ?? "",
      ]),
    );
    filename = "donors.csv";
  } else if (type === "recipients") {
    const scopeWhere = recipientFilter(session);
    const rows = await prisma.recipient.findMany({
      where: { deletedAt: null, ...scopeWhere },
      orderBy: { name: "asc" },
    });
    csv = toCsv(
      ["Name", "Category", "Phone", "Address", "Active", "Notes"],
      rows.map((r) => [
        r.name,
        r.category,
        r.phone ?? "",
        r.address ?? "",
        r.isActive ? "Yes" : "No",
        r.notes ?? "",
      ]),
    );
    filename = "recipients.csv";
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  return csvResponse(filename, csv);
}
