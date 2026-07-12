import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare, hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { isLockedOut, recordFailedAttempt, resetLockout } from "@/lib/account-lockout";
import type { Role, ScopeType } from "@prisma/client";

// Used to keep authorize()'s response time consistent whether or not the
// email exists, so timing can't be used to enumerate accounts.
const DUMMY_HASH = hashSync("no-such-user-timing-safety", 12);

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      scopeType: ScopeType;
      tokenVersion: number;
    };
  }
  interface User {
    role: Role;
    scopeType: ScopeType;
    tokenVersion: number;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email);
        // 5 attempts per email per 15 minutes (checkRateLimit defaults)
        if (!checkRateLimit(`login:${email}`)) {
          logAudit({ event: "LOGIN_RATE_LIMITED", email });
          return null;
        }
        const user = await prisma.user.findUnique({ where: { email } });
        const valid = await compare(String(credentials.password), user?.passwordHash ?? DUMMY_HASH);
        const locked = user ? isLockedOut(user) : false;

        if (!user || !valid) {
          if (user && !locked) {
            await prisma.user.update({
              where: { id: user.id },
              data: recordFailedAttempt(user.failedAttempts),
            });
          }
          logAudit({
            event: "LOGIN_FAILURE",
            email,
            ...(locked ? { details: { reason: "locked" } } : {}),
          });
          return null;
        }
        if (locked) {
          logAudit({ event: "LOGIN_FAILURE", email, details: { reason: "locked" } });
          return null;
        }
        if (!user.active) {
          logAudit({ event: "LOGIN_FAILURE", email, details: { reason: "inactive" } });
          return null;
        }
        if (user.failedAttempts > 0) {
          await prisma.user.update({ where: { id: user.id }, data: resetLockout() });
        }
        logAudit({ event: "LOGIN_SUCCESS", email: user.email, details: { role: user.role } });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          scopeType: user.scopeType,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.scopeType = user.scopeType;
        token.tokenVersion = user.tokenVersion ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.scopeType = token.scopeType as ScopeType;
      session.user.tokenVersion = token.tokenVersion as number;
      return session;
    },
    async authorized({ auth }) {
      if (!auth?.user?.email) return false;
      const user = await prisma.user.findUnique({
        where: { email: auth.user.email },
        select: { active: true, tokenVersion: true },
      });
      if (!user || !user.active) return false;
      if (user.tokenVersion !== auth.user.tokenVersion) return false;
      return true;
    },
  },
  secret: process.env.AUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === "true",
});
