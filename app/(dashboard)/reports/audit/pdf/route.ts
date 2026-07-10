import { NextResponse } from "next/server"
import { getAuditReport } from "../../actions"
import { renderToBuffer } from "@react-pdf/renderer"
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import React from "react"

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#888888", marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "bold", marginTop: 12, marginBottom: 6 },
  headerRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #cccccc",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #eeeeee",
    paddingVertical: 3,
  },
  col: { flex: 1 },
  muted: { color: "#666666" },
  green: { color: "#16a34a" },
  red: { color: "#dc2626" },
  summary: { flexDirection: "row", gap: 20, marginBottom: 16 },
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const from = url.searchParams.get("from") ?? new Date().toISOString().slice(0, 7) + "-01"
  const to = url.searchParams.get("to") ?? new Date().toISOString().slice(0, 10)
  const { donations, distributions } = await getAuditReport(from, to)

  const totalIn = donations.reduce((s, d) => s + Number(d.amount), 0)
  const totalOut = distributions.reduce((s, d) => s + Number(d.amount), 0)

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, "Full Audit Report"),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Period: ${from} to ${to} · Generated ${new Date().toLocaleDateString()}`
      ),
      React.createElement(
        View,
        { style: styles.summary },
        React.createElement(Text, { style: { ...styles.green } }, `Received: PKR ${totalIn.toLocaleString()}`),
        React.createElement(Text, { style: { ...styles.red } }, `Distributed: PKR ${totalOut.toLocaleString()}`),
        React.createElement(Text, null, `Net: PKR ${(totalIn - totalOut).toLocaleString()}`)
      ),
      React.createElement(Text, { style: styles.sectionTitle }, `Donations (${donations.length})`),
      React.createElement(
        View,
        { style: styles.headerRow },
        React.createElement(Text, { style: styles.col }, "Date"),
        React.createElement(Text, { style: { flex: 2 } }, "Donor"),
        React.createElement(Text, { style: styles.col }, "Amount"),
        React.createElement(Text, { style: styles.col }, "Context"),
        React.createElement(Text, { style: styles.col }, "Type")
      ),
      ...donations.map((d) =>
        React.createElement(
          View,
          { key: d.id, style: styles.row },
          React.createElement(Text, { style: styles.col }, new Date(d.date).toLocaleDateString()),
          React.createElement(Text, { style: { flex: 2 } }, d.donor?.name ?? "Anonymous"),
          React.createElement(Text, { style: { ...styles.col, ...styles.green } }, `PKR ${Number(d.amount).toLocaleString()}`),
          React.createElement(Text, { style: { ...styles.col, ...styles.muted } }, d.paymentContext),
          React.createElement(Text, { style: { ...styles.col, ...styles.muted } }, d.type)
        )
      ),
      React.createElement(Text, { style: styles.sectionTitle }, `Distributions (${distributions.length})`),
      React.createElement(
        View,
        { style: styles.headerRow },
        React.createElement(Text, { style: styles.col }, "Date"),
        React.createElement(Text, { style: { flex: 2 } }, "Recipient"),
        React.createElement(Text, { style: styles.col }, "Amount"),
        React.createElement(Text, { style: { flex: 2 } }, "Purpose")
      ),
      ...distributions.map((d) =>
        React.createElement(
          View,
          { key: d.id, style: styles.row },
          React.createElement(Text, { style: styles.col }, new Date(d.date).toLocaleDateString()),
          React.createElement(Text, { style: { flex: 2 } }, d.recipient.name),
          React.createElement(Text, { style: { ...styles.col, ...styles.red } }, `PKR ${Number(d.amount).toLocaleString()}`),
          React.createElement(Text, { style: { flex: 2, ...styles.muted } }, d.purpose)
        )
      )
    )
  )

  const buffer = await renderToBuffer(doc)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="audit-${from}-${to}.pdf"`,
    },
  })
}
