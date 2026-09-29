process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const request = require("supertest");
const app = require("../app");
const prisma = require("../src/utils/prisma");

afterAll(() => prisma.$disconnect());

describe("Auth Endpoints", () => {
  it("POST /api/v1/auth/login should reject missing credentials", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/v1/auth/forgot-password should reject missing identifier", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/v1/auth/signup should reject short passwords", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .send({ fullName: "Test", phoneNumber: "9876543210", password: "short", cityId: 1 });
    expect(res.status).toBe(400);
  });

  it("protected routes should reject requests without a token", async () => {
    const res = await request(app).get("/api/v1/government/stats");
    expect(res.status).toBe(401);
  });
});
