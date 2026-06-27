import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { hash } from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  const passwordHash = await hash("admin123", 12)
  await db.user.upsert({
    where: { email: "admin@hisab.local" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@hisab.local",
      passwordHash,
      role: "ADMIN",
      scopeType: "ALL",
    },
  })
  console.log("Seeded: admin@hisab.local / admin123")
}

main().catch(console.error).finally(() => db.$disconnect())
