"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getDesignatedDonationsForRecipient } from "@/app/(dashboard)/distributions/actions"
import { getErrorMessage } from "@/lib/utils"

const schema = z.object({
  recipientId: z.string().min(1, "Select a recipient"),
  amount: z.number().positive("Amount must be positive"),
  date: z.string().min(1, "Date required"),
  purpose: z.string().min(1, "Purpose required"),
  donationId: z.string().optional(),
  notes: z.string().optional(),
})
type Fields = z.infer<typeof schema>

interface Recipient { id: string; name: string }
interface DesignatedDonation { id: string; amount: number; remaining: number; date: Date }

export function DistributionForm({
  onSubmit,
  recipients,
  defaultValues,
  defaultDesignatedDonations = [],
}: {
  onSubmit: (data: Fields) => Promise<void>
  recipients: Recipient[]
  defaultValues?: Partial<Fields>
  defaultDesignatedDonations?: DesignatedDonation[]
}) {
  const router = useRouter()
  const [designatedDonations, setDesignatedDonations] = useState<DesignatedDonation[]>(defaultDesignatedDonations)
  const [serverError, setServerError] = useState("")
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { date: new Date().toISOString().slice(0, 10), ...defaultValues },
  })

  async function handleRecipientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    if (id) {
      const donations = await getDesignatedDonationsForRecipient(id)
      setDesignatedDonations(donations)
    } else {
      setDesignatedDonations([])
    }
  }

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          await onSubmit(data)
          toast.success("Distribution saved")
          router.push("/distributions")
        } catch (e) {
          const message = getErrorMessage(e)
          setServerError(message)
          toast.error(message)
        }
      })}
      className="space-y-4 max-w-lg"
    >
      <div className="space-y-1">
        <Label>Recipient *</Label>
        <select
          {...register("recipientId", { onChange: handleRecipientChange })}
          className="w-full border border-border rounded px-3 py-2 text-sm bg-background"
        >
          <option value="">Select recipient…</option>
          {recipients.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        {errors.recipientId && <p className="text-xs text-destructive">{errors.recipientId.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Amount (PKR) *</Label>
        <Input {...register("amount", { valueAsNumber: true })} type="number" step="0.01" placeholder="0" />
        {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Date given *</Label>
        <Input {...register("date")} type="date" />
        {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Purpose *</Label>
        <Input {...register("purpose")} placeholder="e.g. Monthly ration, Hospital bill, School fees" />
        {errors.purpose && <p className="text-xs text-destructive">{errors.purpose.message}</p>}
      </div>
      {designatedDonations.length > 0 && (
        <div className="space-y-1">
          <Label>Link to designated donation (optional)</Label>
          <select {...register("donationId")} className="w-full border border-border rounded px-3 py-2 text-sm bg-background">
            <option value="">Draw from general pool</option>
            {designatedDonations.map((d) => (
              <option key={d.id} value={d.id}>
                PKR {d.amount.toLocaleString()} donation (PKR {d.remaining.toLocaleString()} remaining) — {new Date(d.date).toLocaleDateString()}
              </option>
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
          {isSubmitting ? "Saving…" : "Save Distribution"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/distributions")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
