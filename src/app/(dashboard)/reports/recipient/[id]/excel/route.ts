import { NextResponse } from "next/server"
import { getRecipientHistory } from "../../../actions"
import ExcelJS from "exceljs"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const recipient = await getRecipientHistory(id)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Recipient History")

  ws.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Amount (PKR)", key: "amount", width: 14 },
    { header: "Purpose", key: "purpose", width: 32 },
    { header: "Source Donation Context", key: "source", width: 24 },
    { header: "Recorded By", key: "recordedBy", width: 20 },
  ]

  for (const d of recipient.distributions) {
    ws.addRow({
      date: new Date(d.date).toLocaleDateString(),
      amount: Number(d.amount),
      purpose: d.purpose,
      source: d.donation
        ? `${d.donation.paymentContext} (${d.donation.donor?.name ?? "Anon"})`
        : "General Pool",
      recordedBy: d.recordedBy.name,
    })
  }

  ws.getRow(1).font = { bold: true }

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="recipient-history-${id}.xlsx"`,
    },
  })
}
