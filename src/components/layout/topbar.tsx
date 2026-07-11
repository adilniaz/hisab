"use client"
import { signOut } from "next-auth/react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function Topbar({ title }: { title?: string }) {
  const { data: session } = useSession()
  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-6 shrink-0 bg-background">
      <span className="text-sm font-medium text-foreground">{title}</span>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-xs">
          {session?.user.role}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign out
        </Button>
      </div>
    </header>
  )
}
