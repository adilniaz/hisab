import { notFound, redirect } from "next/navigation";
import { getRecipient, updateRecipient } from "../../actions";
import { RecipientForm } from "@/components/recipients/recipient-form";
import { Topbar } from "@/components/layout/topbar";
import { requireAuth, canModify } from "@/lib/permissions";

export default async function RecipientEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [recipient, session] = await Promise.all([getRecipient(id), requireAuth()]);
  if (!recipient) notFound();
  if (!canModify(session)) redirect(`/recipients/${id}`);

  return (
    <>
      <Topbar title="Edit Recipient" />
      <div className="p-6">
        <RecipientForm
          onSubmit={(data) => updateRecipient(id, data)}
          defaultValues={{
            name: recipient.name,
            phone: recipient.phone ?? undefined,
            address: recipient.address ?? undefined,
            category: recipient.category,
            notes: recipient.notes ?? undefined,
            isActive: recipient.isActive,
          }}
        />
      </div>
    </>
  );
}
