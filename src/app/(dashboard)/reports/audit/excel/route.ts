import { NextResponse } from "next/server"
import { getAuditReport } from "../../actions"
import ExcelJS from "exceljs"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const from = url.searchParams.get("from") ?? new Date().toISOString().slice(0, 7) + "-01"
  const to = url.searchParams.get("to") ?? new Date().toISOString().slice(0, 10)
  const { donations, distributions } = await getAuditReport(from, to)

  const wb = new ExcelJS.Workbook()

  const donSheet = wb.addWorksheet("Donations")
  donSheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Donor", key: "donor", width: 22 },
    { header: "Amount (PKR)", key: "amount", width: 14 },
    { header: "Context", key: "context", width: 12 },
    { header: "Type", key: "type", width: 12 },
    { header: "Method", key: "method", width: 16 },
  ]
  for (const d of donations) {
    donSheet.addRow({
      date: new Date(d.date).toLocaleDateString(),
      donor: d.donor?.name ?? "Anonymous",
      amount: Number(d.amount),
      context: d.paymentContext,
      type: d.type,
      method: d.paymentMethod.replace(/_/g, " "),
    })
  }
  donSheet.getRow(1).font = { bold: true }

  const distSheet = wb.addWorksheet("Distributions")
  distSheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Recipient", key: "recipient", width: 22 },
    { header: "Amount (PKR)", key: "amount", width: 14 },
    { header: "Purpose", key: "purpose", width: 32 },
    { header: "Category", key: "category", width: 14 },
  ]
  for (const d of distributions) {
    distSheet.addRow({
      date: new Date(d.date).toLocaleDateString(),
      recipient: d.recipient.name,
      amount: Number(d.amount),
      purpose: d.purpose,
      category: d.recipient.category,
    })
  }
  distSheet.getRow(1).font = { bold: true }

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="audit-${from}-${to}.xlsx"`,
    },
  })
}
