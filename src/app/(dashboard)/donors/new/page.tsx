import { redirect } from "next/navigation";
import { requireAuth, canModify } from "@/lib/permissions";
import { createDonor } from "../actions";
import { DonorForm } from "@/components/donors/donor-form";
import { Topbar } from "@/components/layout/topbar";

export default async function NewDonorPage() {
  const session = await requireAuth();
  if (!canModify(session)) redirect("/donors");
  return (
    <>
      <Topbar title="Add Donor" />
      <div className="p-6">
        <DonorForm onSubmit={createDonor} />
      </div>
    </>
  );
}
