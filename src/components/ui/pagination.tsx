import Link from "next/link"
import { cn } from "@/lib/utils"
import { buttonVariants } from "./button"

export function Pagination({
  page,
  total,
  pageSize,
  params,
  basePath,
}: {
  page: number
  total: number
  pageSize: number
  params: Record<string, string | undefined>
  basePath: string
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  function buildUrl(p: number) {
    const sp = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v) })
    if (p > 1) sp.set("page", String(p))
    else sp.delete("page")
    const qs = sp.toString()
    return `${basePath}${qs ? `?${qs}` : ""}`
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span>{from}–{to} of {total}</span>
      {page > 1 && (
        <Link href={buildUrl(page - 1)} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          ← Prev
        </Link>
      )}
      {page < totalPages && (
        <Link href={buildUrl(page + 1)} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Next →
        </Link>
      )}
    </div>
  )
}
