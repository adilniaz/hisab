import { getDistributions } from "./actions";
import { DistributionTable } from "@/components/distributions/distribution-table";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";
import { requireAuth, canModify } from "@/lib/permissions";

export default async function DistributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requireAuth();
  const { q, page: pageStr } = await searchParams;
  const page = Number(pageStr ?? "1");
  const { items, total, pageSize } = await getDistributions({ q, page });
  return (
    <>
      <Topbar title="Distributions" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <form method="get">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search recipient…"
              className="border border-border rounded px-3 py-1.5 text-sm bg-background"
            />
          </form>
          {canModify(session) && (
            <Link href="/distributions/new">
              <Button size="sm">Record Distribution</Button>
            </Link>
          )}
        </div>
        <DistributionTable distributions={items} />
        <Pagination
          page={page}
          total={total}
          pageSize={pageSize}
          basePath="/distributions"
          params={{ q }}
        />
      </div>
    </>
  );
}
