import { NextResponse } from "next/server";
import { getRecipientHistory } from "../../../actions";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#888888", marginBottom: 20 },
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
    paddingVertical: 4,
  },
  col1: { flex: 1 },
  col2: { flex: 2 },
  muted: { color: "#666666" },
  red: { color: "#dc2626" },
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipient = await getRecipientHistory(id);
  const total = recipient.distributions.reduce((s, d) => s + Number(d.amount), 0);

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, recipient.name),
      React.createElement(
        Text,
        { style: styles.subtitle },
        `Recipient History · ${recipient.category} · Total received PKR ${total.toLocaleString()} · Generated ${new Date().toLocaleDateString()}`,
      ),
      React.createElement(
        View,
        { style: styles.headerRow },
        React.createElement(Text, { style: styles.col1 }, "Date"),
        React.createElement(Text, { style: styles.col1 }, "Amount"),
        React.createElement(Text, { style: styles.col2 }, "Purpose"),
        React.createElement(Text, { style: styles.col2 }, "Source"),
        React.createElement(Text, { style: styles.col1 }, "By"),
      ),
      ...recipient.distributions.map((d) =>
        React.createElement(
          View,
          { key: d.id, style: styles.row },
          React.createElement(Text, { style: styles.col1 }, new Date(d.date).toLocaleDateString()),
          React.createElement(
            Text,
            { style: { ...styles.col1, ...styles.red } },
            `PKR ${Number(d.amount).toLocaleString()}`,
          ),
          React.createElement(Text, { style: styles.col2 }, d.purpose),
          React.createElement(
            Text,
            { style: { ...styles.col2, ...styles.muted } },
            d.donation
              ? `${d.donation.paymentContext} (${d.donation.donor?.name ?? "Anon"})`
              : "Pool",
          ),
          React.createElement(
            Text,
            { style: { ...styles.col1, ...styles.muted } },
            d.recordedBy.name,
          ),
        ),
      ),
    ),
  );

  const buffer = await renderToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recipient-history-${id}.pdf"`,
    },
  });
}
