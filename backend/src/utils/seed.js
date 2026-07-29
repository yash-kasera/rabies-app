require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const readline = require("readline");

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function seed() {
  console.log("=== Seed: Create First Government Admin ===\n");

  const email = await new Promise((resolve) =>
    rl.question("Admin email: ", resolve)
  );
  const password = await new Promise((resolve) =>
    rl.question("Admin password (min 8 chars): ", resolve)
  );

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    await prisma.$disconnect();
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { phoneNumber: email } });
  if (existing) {
    console.error("A user with that email/phone already exists.");
    await prisma.$disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      fullName: "Super Admin",
      phoneNumber: email,
      email,
      passwordHash,
      role: "government",
      cityId: 1,
      phoneVerified: true,
    },
  });

  console.log(`\nGovernment admin created: ${admin.email} (ID: ${admin.id})`);
  await prisma.$disconnect();
  rl.close();
}

seed().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});