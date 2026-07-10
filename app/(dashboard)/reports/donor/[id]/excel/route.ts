import { NextResponse } from "next/server"
import { getDonorStatement } from "../../../actions"
import ExcelJS from "exceljs"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const donor = await getDonorStatement(id)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Donor Statement")

  ws.columns = [
    { header: "Donation Date", key: "donDate", width: 14 },
    { header: "Amount (PKR)", key: "donAmount", width: 14 },
    { header: "Context", key: "context", width: 12 },
    { header: "Type", key: "type", width: 12 },
    { header: "Recipient", key: "recipient", width: 22 },
    { header: "Distributed (PKR)", key: "distAmount", width: 16 },
    { header: "Distribution Date", key: "distDate", width: 16 },
    { header: "Purpose", key: "purpose", width: 32 },
  ]

  for (const donation of donor.donations) {
    if (donation.distributions.length === 0) {
      ws.addRow({
        donDate: new Date(donation.date).toLocaleDateString(),
        donAmount: Number(donation.amount),
        context: donation.paymentContext,
        type: donation.type,
        recipient: "",
        distAmount: "",
        distDate: "",
        purpose: "",
      })
    }
    for (const d of donation.distributions) {
      ws.addRow({
        donDate: new Date(donation.date).toLocaleDateString(),
        donAmount: Number(donation.amount),
        context: donation.paymentContext,
        type: donation.type,
        recipient: d.recipient.name,
        distAmount: Number(d.amount),
        distDate: new Date(d.date).toLocaleDateString(),
        purpose: d.purpose,
      })
    }
  }

  ws.getRow(1).font = { bold: true }

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="donor-statement-${id}.xlsx"`,
    },
  })
}
