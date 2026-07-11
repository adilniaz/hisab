import { redirect } from "next/navigation";
import { requireAuth, canModify } from "@/lib/permissions";
import { createDonation, getDonorsForPicker } from "../actions";
import { DonationForm } from "@/components/donations/donation-form";
import { Topbar } from "@/components/layout/topbar";
import { prisma } from "@/lib/prisma";

export default async function NewDonationPage() {
  const session = await requireAuth();
  if (!canModify(session)) redirect("/donations");
  const [donors, recipients] = await Promise.all([
    getDonorsForPicker(),
    prisma.recipient.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <>
      <Topbar title="Record Donation" />
      <div className="p-6">
        <DonationForm onSubmit={createDonation} donors={donors} recipients={recipients} />
      </div>
    </>
  );
}
