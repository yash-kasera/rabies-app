const { PrismaClient } = require("@prisma/client");

// One shared client so the app keeps a single connection pool.
const prisma = new PrismaClient();

module.exports = prisma;
