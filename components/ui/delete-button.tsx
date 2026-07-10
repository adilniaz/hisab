"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "./button"
import { getErrorMessage } from "@/lib/utils"

export function DeleteButton({
  action,
  noun,
  redirectTo,
}: {
  action: () => Promise<void>
  noun: string
  redirectTo?: string
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    if (!confirm(`Delete this ${noun}? This cannot be undone.`)) return
    startTransition(async () => {
      try {
        await action()
        toast.success(`${noun} deleted`)
        if (redirectTo) router.push(redirectTo)
      } catch (e) {
        toast.error(getErrorMessage(e))
      }
    })
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? "Deleting…" : "Delete"}
    </Button>
  )
}
