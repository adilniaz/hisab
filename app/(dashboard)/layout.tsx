import { SessionProvider } from "next-auth/react"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/layout/sidebar"
import { IdleTimeout } from "@/components/auth/idle-timeout"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <SessionProvider session={session}>
      <div className="flex h-full bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-y-auto">{children}</main>
      </div>
      <IdleTimeout />
    </SessionProvider>
  )
}
