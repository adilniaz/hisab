import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { User } from "@prisma/client"

type Row = User & { _count: { userScopes: number } }

export function UserTable({ users }: { users: Row[] }) {
  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">No users found.</p>
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="pb-2 font-medium">Name</th>
          <th className="pb-2 font-medium">Email</th>
          <th className="pb-2 font-medium">Role</th>
          <th className="pb-2 font-medium">Scope</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} className="border-b border-border hover:bg-accent/50">
            <td className="py-2">
              <Link href={`/users/${u.id}`} className="hover:underline font-medium">
                {u.name}
              </Link>
            </td>
            <td className="py-2 text-muted-foreground">{u.email}</td>
            <td className="py-2">
              <Badge variant="outline">{u.role}</Badge>
            </td>
            <td className="py-2">
              {u.scopeType === "ALL"
                ? "All data"
                : `Restricted (${u._count.userScopes} items)`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
