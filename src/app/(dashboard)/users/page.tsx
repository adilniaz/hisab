import { requireAuth } from "@/lib/permissions";
import { getUsers } from "./actions";
import { UserTable } from "@/components/users/user-table";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAuth({ roles: ["ADMIN"] });
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr ?? "1");
  const { items, total, pageSize } = await getUsers({ page });
  return (
    <>
      <Topbar title="Users & Access" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Link href="/users/new">
            <Button size="sm">Add User</Button>
          </Link>
        </div>
        <UserTable users={items} />
        <Pagination page={page} total={total} pageSize={pageSize} basePath="/users" params={{}} />
      </div>
    </>
  );
}
