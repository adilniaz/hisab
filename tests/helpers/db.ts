import { prisma } from "@/lib/prisma";

export async function resetDb() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("hisab_test")) {
    throw new Error(
      `resetDb() refused to run: DATABASE_URL does not look like the test database (${url}). ` +
        `Make sure .env.test is loaded before running tests.`,
    );
  }

  await prisma.userScope.deleteMany();
  await prisma.distribution.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.donor.deleteMany();
  await prisma.recipient.deleteMany();
  await prisma.user.deleteMany();
}
