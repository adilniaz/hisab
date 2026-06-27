"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const schema = z.object({
  name: z.string().min(1, "Name required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  category: z.enum(["MEDICAL", "FOOD", "EDUCATION", "RENT", "EMERGENCY", "OTHER"]),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})
type Fields = z.infer<typeof schema>

export function RecipientForm({ onSubmit, defaultValues }: {
  onSubmit: (data: Fields) => Promise<void>
  defaultValues?: Partial<Fields>
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState("")
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.input<typeof schema>, any, Fields>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, category: "OTHER", ...defaultValues },
  })

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          await onSubmit(data)
          toast.success("Recipient saved")
          router.push("/recipients")
        } catch (e: any) {
          setServerError(e.message)
          toast.error(e.message)
        }
      })}
      className="space-y-4 max-w-lg"
    >
      <div className="space-y-1">
        <Label>Name *</Label>
        <Input {...register("name")} placeholder="Full name" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1">
        <Label>Phone</Label>
        <Input {...register("phone")} placeholder="+92 3xx xxxxxxx" />
      </div>
      <div className="space-y-1">
        <Label>Address</Label>
        <Input {...register("address")} />
      </div>
      <div className="space-y-1">
        <Label>Category of need</Label>
        <select {...register("category")} className="w-full border border-border rounded px-3 py-2 text-sm bg-background">
          {(["MEDICAL", "FOOD", "EDUCATION", "RENT", "EMERGENCY", "OTHER"] as const).map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea {...register("notes")} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="active" {...register("isActive")} />
        <Label htmlFor="active">Active recipient</Label>
      </div>
      {serverError && (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{serverError}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Recipient"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/recipients")}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
