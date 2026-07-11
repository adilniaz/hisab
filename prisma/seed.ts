import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

// Idempotent admin seed. Creates the initial admin from ADMIN_EMAIL /
// ADMIN_PASSWORD. Skips gracefully when unset so `npm run db:seed` is safe
// to run on every dev startup.
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log("seed: ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin seed.");
    return;
  }

  const passwordHash = await hash(password, 12);
  await db.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Admin",
      email,
      passwordHash,
      role: "ADMIN",
      scopeType: "ALL",
    },
  });
  console.log(`seed: ensured admin user ${email}.`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
