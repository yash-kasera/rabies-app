const { Router } = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const router = Router();
const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

function generateToken(user, expiresIn) {
  return jwt.sign(
    { id: user.id, role: user.role, hospitalId: user.hospitalId || null, fullName: user.fullName },
    process.env.JWT_SECRET,
    { expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function sanitizeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

router.post("/signup", async (req, res) => {
  try {
    const { fullName, phoneNumber, email, password, cityId } = req.body;

    if (!fullName || !phoneNumber || !password || !cityId) {
      return res.status(400).json({ error: "fullName, phoneNumber, password, and cityId are required" });
    }

    const existing = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existing) {
      return res.status(409).json({ error: "Phone number already registered" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        fullName,
        phoneNumber,
        email,
        passwordHash,
        cityId: parseInt(cityId),
        role: "user",
      },
    });

    const token = generateToken(user);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: "Identifier and password are required" });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phoneNumber: identifier }, { email: identifier }],
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    let hospitalId = null;
    let hospitalName = null;
    if (user.role === "hospital") {
      const hospital = await prisma.hospital.findFirst({
        where: { accounts: { some: { id: user.id } } },
      });
      hospitalId = hospital?.id || null;
      hospitalName = hospital?.name || null;
    }

    const tokenExpiry = user.role === "user" ? "7d" : "1d";
    const token = generateToken({ ...user, hospitalId, hospitalName }, tokenExpiry);
    res.json({
      token,
      user: sanitizeUser(user),
      hospitalName,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ error: "Email or phone required" });

    const user = await prisma.user.findFirst({
      where: { OR: [{ phoneNumber: identifier }, { email: identifier }] },
    });
    if (!user) return res.status(404).json({ error: "Account not found" });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    res.json({ message: "Reset token generated", token });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: "Token and new password required" });

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash, mustChangePassword: false } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } }),
    ]);

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/change-password", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });
    const token = authHeader.split(" ")[1];
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both passwords required" });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Current password incorrect" });

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;