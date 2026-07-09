import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rate-limit"
import type { Role, ScopeType } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: { id: string; name: string; email: string; role: Role; scopeType: ScopeType }
  }
  interface User {
    role: Role
    scopeType: ScopeType
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const { allowed } = checkRateLimit(`login:${String(credentials.email)}`)
        if (!allowed) return null
        const user = await db.user.findUnique({
          where: { email: String(credentials.email) },
        })
        if (!user) return null
        const valid = await compare(String(credentials.password), user.passwordHash)
        if (!valid) return null
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          scopeType: user.scopeType,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.scopeType = (user as any).scopeType
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.scopeType = token.scopeType as ScopeType
      return session
    },
    async authorized({ auth }) {
      if (!auth?.user?.email) return false
      const user = await db.user.findUnique({
        where: { email: auth.user.email },
        select: { id: true },
      })
      return !!user
    },
  },
})
