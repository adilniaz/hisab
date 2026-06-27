"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { setUserScope } from "@/app/(dashboard)/users/actions"

interface Donor { id: string; name: string | null; isAnonymous: boolean }
interface Recipient { id: string; name: string }

interface UserFormProps {
  onSubmit: (data: {
    name: string
    email: string
    password?: string
    role: "ADMIN" | "DATA_ENTRY" | "VIEWER"
    scopeType: "ALL" | "RESTRICTED"
  }) => Promise<void>
  defaultValues?: { name?: string; email?: string; role?: string; scopeType?: string }
  userId?: string
  allDonors?: Donor[]
  allRecipients?: Recipient[]
  assignedDonorIds?: string[]
  assignedRecipientIds?: string[]
}

export function UserForm({
  onSubmit,
  defaultValues,
  userId,
  allDonors = [],
  allRecipients = [],
  assignedDonorIds = [],
  assignedRecipientIds = [],
}: UserFormProps) {
  const router = useRouter()
  const [scopeType, setScopeType] = useState(defaultValues?.scopeType ?? "ALL")
  const [selectedDonors, setSelectedDonors] = useState<string[]>(assignedDonorIds)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(assignedRecipientIds)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function toggleDonor(id: string) {
    setSelectedDonors((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }
  function toggleRecipient(id: string) {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const form = new FormData(e.currentTarget)
    try {
      await onSubmit({
        name: form.get("name") as string,
        email: form.get("email") as string,
        password: (form.get("password") as string) || undefined,
        role: form.get("role") as "ADMIN" | "DATA_ENTRY" | "VIEWER",
        scopeType: form.get("scopeType") as "ALL" | "RESTRICTED",
      })
      if (userId && form.get("scopeType") === "RESTRICTED") {
        await setUserScope(userId, selectedDonors, selectedRecipients)
      }
      router.push("/users")
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="space-y-1">
        <Label>Name *</Label>
        <Input name="name" defaultValue={defaultValues?.name} required />
      </div>
      <div className="space-y-1">
        <Label>Email *</Label>
        <Input name="email" type="email" defaultValue={defaultValues?.email} required />
      </div>
      <div className="space-y-1">
        <Label>{userId ? "New password (leave blank to keep current)" : "Password *"}</Label>
        <Input name="password" type="password" minLength={8} required={!userId} />
      </div>
      <div className="space-y-1">
        <Label>Role</Label>
        <select name="role" defaultValue={defaultValues?.role ?? "VIEWER"} className="w-full border border-border rounded px-3 py-2 text-sm bg-background">
          <option value="ADMIN">Admin — full access, manages users</option>
          <option value="DATA_ENTRY">Data Entry — can add/edit records</option>
          <option value="VIEWER">Viewer — read-only</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label>Data access</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="scopeType"
              value="ALL"
              checked={scopeType === "ALL"}
              onChange={() => setScopeType("ALL")}
            />
            See all donors & recipients
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="scopeType"
              value="RESTRICTED"
              checked={scopeType === "RESTRICTED"}
              onChange={() => setScopeType("RESTRICTED")}
            />
            Restricted to assigned only
          </label>
        </div>
      </div>
      {scopeType === "RESTRICTED" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2">Donors they can see</p>
            <div className="border border-border rounded p-2 max-h-48 overflow-y-auto space-y-1">
              {allDonors.map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDonors.includes(d.id)}
                    onChange={() => toggleDonor(d.id)}
                  />
                  {d.isAnonymous ? "Anonymous" : (d.name ?? "—")}
                </label>
              ))}
              {allDonors.length === 0 && (
                <p className="text-xs text-muted-foreground">No donors yet.</p>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Recipients they can see</p>
            <div className="border border-border rounded p-2 max-h-48 overflow-y-auto space-y-1">
              {allRecipients.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRecipients.includes(r.id)}
                    onChange={() => toggleRecipient(r.id)}
                  />
                  {r.name}
                </label>
              ))}
              {allRecipients.length === 0 && (
                <p className="text-xs text-muted-foreground">No recipients yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save User"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/users")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
