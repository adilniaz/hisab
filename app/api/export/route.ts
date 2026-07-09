import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/permissions"
import { db } from "@/lib/db"
import { toCsv, csvResponse } from "@/lib/export-utils"

export async function GET(req: NextRequest) {
  await requireAuth({ roles: ['ADMIN'] })
  const type = req.nextUrl.searchParams.get("type") ?? "donations"

  let csv: string
  let filename: string

  if (type === "donations") {
    const rows = await db.donation.findMany({
      where: { deletedAt: null },
      include: { donor: true, designatedRecipient: true, recordedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    })
    csv = toCsv(
      ["Date", "Donor", "Amount (PKR)", "Context", "Type", "Designated For", "Method", "Notes", "Recorded By"],
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
      ])
    )
    filename = "donations.csv"
  } else if (type === "distributions") {
    const rows = await db.distribution.findMany({
      where: { deletedAt: null },
      include: { recipient: true, donation: { select: { paymentContext: true } }, recordedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    })
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
      ])
    )
    filename = "distributions.csv"
  } else if (type === "donors") {
    const rows = await db.donor.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    })
    csv = toCsv(
      ["Name", "Anonymous", "Phone", "Email", "Address", "Recurring", "Notes"],
      rows.map((r) => [r.name ?? "Anonymous", r.isAnonymous ? "Yes" : "No", r.phone ?? "", r.email ?? "", r.address ?? "", r.isRecurring ? "Yes" : "No", r.notes ?? ""])
    )
    filename = "donors.csv"
  } else if (type === "recipients") {
    const rows = await db.recipient.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    })
    csv = toCsv(
      ["Name", "Category", "Phone", "Address", "Active", "Notes"],
      rows.map((r) => [r.name, r.category, r.phone ?? "", r.address ?? "", r.isActive ? "Yes" : "No", r.notes ?? ""])
    )
    filename = "recipients.csv"
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  }

  return csvResponse(filename, csv)
}
