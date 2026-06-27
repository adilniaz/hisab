"use client"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"

export interface MonthData {
  month: string
  received: number
  distributed: number
}

export function MonthlyChart({ data }: { data: MonthData[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v) => `PKR ${Number(v).toLocaleString()}`} />
          <Legend />
          <Bar dataKey="received" name="Received" fill="#4ade80" radius={[3, 3, 0, 0]} />
          <Bar dataKey="distributed" name="Distributed" fill="#f87171" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
