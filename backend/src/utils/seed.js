require("dotenv/config");
const bcrypt = require("bcrypt");
const readline = require("readline");
const prisma = require("./prisma");
const { MIN_PASSWORD_LENGTH, isValidEmail, isValidPassword } = require("./validation");

// Usage: node src/utils/seed.js
// Non-interactive: ADMIN_EMAIL=... ADMIN_PASSWORD=... node src/utils/seed.js

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function fail(message) {
  console.error(message);
  await prisma.$disconnect();
  process.exit(1);
}

async function seed() {
  console.log("=== Seed: Create First Government Admin ===\n");

  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    email = email || await ask(rl, "Admin email: ");
    password = password || await ask(rl, `Admin password (min ${MIN_PASSWORD_LENGTH} chars): `);
    rl.close();
  }
  email = email.trim().toLowerCase();

  if (!isValidEmail(email)) await fail("Enter a valid email address.");
  if (!isValidPassword(password)) await fail(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);

  const city = await prisma.city.findFirst({ orderBy: { id: "asc" } });
  if (!city) await fail("No cities found. Run `npx prisma db seed` first to load cities and content.");

  const existing = await prisma.user.findFirst({
    where: { OR: [{ phoneNumber: email }, { email: { equals: email, mode: "insensitive" } }] },
  });
  if (existing) await fail("A user with that email/phone already exists.");

  const admin = await prisma.user.create({
    data: {
      fullName: "Super Admin",
      phoneNumber: email,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "government",
      cityId: city.id,
      phoneVerified: true,
      isAdmin: true, // super admin: the only account that can add government staff or clear the activity log
    },
  });

  console.log(`\nGovernment admin created: ${admin.email} (ID: ${admin.id})`);
  await prisma.$disconnect();
}

seed().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
