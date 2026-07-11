"use client"
import { useEffect, useState } from "react"
import { getAllDonors, getAllRecipients } from "./actions"
import { Topbar } from "@/components/layout/topbar"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Donor { id: string; name: string | null; isAnonymous: boolean }
interface Recipient { id: string; name: string }

export default function ReportsPage() {
  const [donors, setDonors] = useState<Donor[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])

  useEffect(() => {
    getAllDonors().then(setDonors)
    getAllRecipients().then(setRecipients)
  }, [])

  return (
    <>
      <Topbar title="Reports & Export" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Donor Statement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                All donations from a donor + where each rupee went.
              </p>
              <select
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
                onChange={(e) => {
                  if (e.target.value) window.location.href = `/reports/donor/${e.target.value}`
                }}
              >
                <option value="">Select donor…</option>
                {donors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.isAnonymous ? "Anonymous" : (d.name ?? "—")}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recipient History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Full timeline of distributions to a recipient.
              </p>
              <select
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
                onChange={(e) => {
                  if (e.target.value) window.location.href = `/reports/recipient/${e.target.value}`
                }}
              >
                <option value="">Select recipient…</option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Full Audit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                All transactions in a date range.
              </p>
              <Link href="/reports/audit" className="text-sm text-primary hover:underline">
                Open audit report →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
