import { requireAuth } from "@/lib/permissions"
import { getUsers } from "./actions"
import { UserTable } from "@/components/users/user-table"
import { Topbar } from "@/components/layout/topbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function UsersPage() {
  await requireAuth({ roles: ['ADMIN'] })
  const users = await getUsers()
  return (
    <>
      <Topbar title="Users & Access" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Link href="/users/new">
            <Button size="sm">Add User</Button>
          </Link>
        </div>
        <UserTable users={users} />
      </div>
    </>
  )
}
