import { NextResponse } from "next/server"
import { getDonorStatement } from "../../../actions"
import { renderToBuffer } from "@react-pdf/renderer"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import React from "react"

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#888888", marginBottom: 20 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "bold",
    backgroundColor: "#f5f5f5",
    padding: 6,
    marginTop: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #eeeeee",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  col1: { flex: 2 },
  col2: { flex: 1 },
  muted: { color: "#666666" },
  green: { color: "#16a34a" },
  red: { color: "#dc2626" },
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const donor = await getDonorStatement(id)
  const total = donor.donations.reduce((s, d) => s + Number(d.amount), 0)

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, donor.name ?? "Anonymous Donor"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Donor Statement · Total PKR ${total.toLocaleString()} · Generated ${new Date().toLocaleDateString()}`
      ),
      ...donor.donations.map((donation) => {
        const distributed = donation.distributions.reduce((s, d) => s + Number(d.amount), 0)
        return React.createElement(
          View,
          { key: donation.id },
          React.createElement(
            Text,
            { style: styles.sectionHeader },
            `PKR ${Number(donation.amount).toLocaleString()} — ${new Date(donation.date).toLocaleDateString()} (${donation.paymentContext} · ${donation.type})`
          ),
          React.createElement(
            Text,
            { style: { ...styles.muted, fontSize: 9, marginBottom: 4, paddingHorizontal: 4 } },
            `Distributed: PKR ${distributed.toLocaleString()} · Remaining: PKR ${Math.max(0, Number(donation.amount) - distributed).toLocaleString()}`
          ),
          ...donation.distributions.map((d) =>
            React.createElement(
              View,
              { key: d.id, style: styles.row },
              React.createElement(Text, { style: styles.col1 }, d.recipient.name),
              React.createElement(Text, { style: { ...styles.col2, ...styles.red } }, `PKR ${Number(d.amount).toLocaleString()}`),
              React.createElement(Text, { style: styles.col2 }, new Date(d.date).toLocaleDateString()),
              React.createElement(Text, { style: { ...styles.col2, ...styles.muted } }, d.purpose)
            )
          )
        )
      })
    )
  )

  const buffer = await renderToBuffer(doc)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="donor-statement-${id}.pdf"`,
    },
  })
}
