"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const schema = z.object({
  donorId: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  amount: z.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date required"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "EASYPAISA", "JAZZCASH", "OTHER"]),
  paymentContext: z.enum(["ZAKAT", "SADAQAH", "GENERAL", "OTHER"]),
  type: z.enum(["POOLED", "DESIGNATED"]),
  designatedRecipientId: z.string().optional(),
  notes: z.string().optional(),
})
type Fields = z.infer<typeof schema>

interface Donor { id: string; name: string | null; isAnonymous: boolean }
interface Recipient { id: string; name: string }

export function DonationForm({ onSubmit, donors, recipients, defaultValues }: {
  onSubmit: (data: Fields) => Promise<void>
  donors: Donor[]
  recipients: Recipient[]
  defaultValues?: Partial<Fields>
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState("")
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<z.input<typeof schema>, any, Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      type: "POOLED",
      paymentMethod: "CASH",
      paymentContext: "GENERAL",
      isAnonymous: false,
      ...defaultValues,
    },
  })
  const isAnonymous = watch("isAnonymous")
  const donationType = watch("type")

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          await onSubmit(data)
          router.push("/donations")
        } catch (e: any) {
          setServerError(e.message)
        }
      })}
      className="space-y-4 max-w-lg"
    >
      <div className="flex items-center gap-2">
        <input type="checkbox" id="anon" {...register("isAnonymous")} />
        <Label htmlFor="anon">Anonymous donation</Label>
      </div>
      {!isAnonymous && (
        <div className="space-y-1">
          <Label>Donor</Label>
          <select {...register("donorId")} className="w-full border border-border rounded px-3 py-2 text-sm bg-background">
            <option value="">Select donor…</option>
            {donors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.isAnonymous ? "Anonymous" : (d.name ?? "—")}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-1">
        <Label>Amount (PKR) *</Label>
        <Input {...register("amount", { valueAsNumber: true })} type="number" step="0.01" placeholder="0" />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Date received *</Label>
        <Input {...register("date")} type="date" />
        {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Payment method</Label>
          <select {...register("paymentMethod")} className="w-full border border-border rounded px-3 py-2 text-sm bg-background">
            {(["CASH", "BANK_TRANSFER", "EASYPAISA", "JAZZCASH", "OTHER"] as const).map((m) => (
              <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Context</Label>
          <select {...register("paymentContext")} className="w-full border border-border rounded px-3 py-2 text-sm bg-background">
            {(["ZAKAT", "SADAQAH", "GENERAL", "OTHER"] as const).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" {...register("type")} value="POOLED" /> Pooled (general fund)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" {...register("type")} value="DESIGNATED" /> Designated for specific recipient
          </label>
        </div>
      </div>
      {donationType === "DESIGNATED" && (
        <div className="space-y-1">
          <Label>Designated recipient</Label>
          <select {...register("designatedRecipientId")} className="w-full border border-border rounded px-3 py-2 text-sm bg-background">
            <option value="">Select recipient…</option>
            {recipients.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea {...register("notes")} />
      </div>
      {serverError && (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{serverError}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Donation"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/donations")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
