"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/utils";

const schema = z.object({
  name: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  isRecurring: z.boolean().default(false),
  notes: z.string().optional(),
});
type Fields = z.infer<typeof schema>;

interface DonorFormProps {
  onSubmit: (data: Fields) => Promise<void>;
  defaultValues?: Partial<Fields>;
}

export function DonorForm({ onSubmit, defaultValues }: DonorFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<z.input<typeof schema>, unknown, Fields>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const isAnonymous = watch("isAnonymous");

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        try {
          await onSubmit(data);
          toast.success("Donor saved");
          router.push("/donors");
        } catch (e) {
          const message = getErrorMessage(e);
          setServerError(message);
          toast.error(message);
        }
      })}
      className="space-y-4 max-w-lg"
    >
      <div className="flex items-center gap-2">
        <input type="checkbox" id="anon" {...register("isAnonymous")} />
        <Label htmlFor="anon">Anonymous donor</Label>
      </div>
      {!isAnonymous && (
        <div className="space-y-1">
          <Label>Name</Label>
          <Input {...register("name")} placeholder="Full name" />
        </div>
      )}
      <div className="space-y-1">
        <Label>Phone</Label>
        <Input {...register("phone")} placeholder="+92 3xx xxxxxxx" />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input {...register("email")} type="email" />
      </div>
      <div className="space-y-1">
        <Label>Address</Label>
        <Input {...register("address")} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="recurring" {...register("isRecurring")} />
        <Label htmlFor="recurring">Regular / recurring donor</Label>
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea {...register("notes")} />
      </div>
      {serverError && (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{serverError}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Donor"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/donors")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
