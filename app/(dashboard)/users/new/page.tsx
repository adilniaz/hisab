import { requireAuth } from "@/lib/permissions"
import { createUser } from "../actions"
import { UserForm } from "@/components/users/user-form"
import { Topbar } from "@/components/layout/topbar"

export default async function NewUserPage() {
  await requireAuth({ roles: ['ADMIN'] })
  return (
    <>
      <Topbar title="Add User" />
      <div className="p-6">
        <UserForm onSubmit={createUser} />
      </div>
    </>
  )
}
