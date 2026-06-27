import { Topbar } from "@/components/layout/topbar"

export default function OverviewPage() {
  return (
    <>
      <Topbar title="Dashboard" />
      <div className="p-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Loading stats…</p>
      </div>
    </>
  )
}
