const { Router } = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../utils/prisma");
const { authenticate, verifyToken } = require("../middleware/auth");
const {
  MIN_PASSWORD_LENGTH, isValidPassword, normalizePhone, isValidEmail, parseId,
} = require("../utils/validation");

const router = Router();

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function generateToken(user, expiresIn) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      hospitalId: user.hospitalId || null,
      fullName: user.fullName,
      mustChangePassword: !!user.mustChangePassword,
      isAdmin: !!user.isAdmin,
    },
    process.env.JWT_SECRET,
    { expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function sanitizeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Phone numbers are unique, emails are not enforced unique in the schema, so an exact
// phone match wins and email matches are resolved deterministically (oldest account first).
async function findUserByIdentifier(identifier) {
  const trimmed = String(identifier).trim();
  const phone = normalizePhone(trimmed);
  const byPhone = await prisma.user.findFirst({
    where: { phoneNumber: { in: [trimmed, phone].filter(Boolean) } },
  });
  if (byPhone) return byPhone;
  return prisma.user.findFirst({
    where: { email: { equals: trimmed, mode: "insensitive" } },
    orderBy: { id: "asc" },
  });
}

async function identifierInUse(value) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { phoneNumber: value },
        { email: { equals: value, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
}

router.post("/signup", async (req, res) => {
  try {
    const { fullName, phoneNumber, email, password, cityId } = req.body;

    if (!fullName?.trim() || !phoneNumber || !password || !cityId) {
      return res.status(400).json({ error: "fullName, phoneNumber, password, and cityId are required" });
    }
    const phone = normalizePhone(phoneNumber);
    if (!phone) return res.status(400).json({ error: "Enter a valid phone number (10–15 digits)" });
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }
    const city = parseId(cityId) && await prisma.city.findUnique({ where: { id: parseId(cityId) } });
    if (!city) return res.status(400).json({ error: "Select a valid city" });

    if (await identifierInUse(phone)) {
      return res.status(409).json({ error: "Phone number already registered" });
    }
    if (normalizedEmail && await identifierInUse(normalizedEmail)) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        phoneNumber: phone,
        email: normalizedEmail,
        passwordHash,
        cityId: city.id,
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

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (user.disabledAt) {
      return res.status(403).json({ error: "This account has been removed. Contact your administrator.", code: "ACCOUNT_REMOVED" });
    }

    let hospitalId = null;
    let hospitalName = null;
    if (user.role === "hospital") {
      const hospital = user.hospitalId
        ? await prisma.hospital.findUnique({ where: { id: user.hospitalId } })
        : null;
      if (!hospital) {
        return res.status(403).json({ error: "No hospital is linked to this account" });
      }
      if (hospital.deletedAt) {
        return res.status(403).json({ error: "This hospital has been removed from the system.", code: "HOSPITAL_REMOVED" });
      }
      if (hospital.status !== "Active") {
        return res.status(403).json({ error: "This hospital has been deactivated. It no longer receives bite reports. Contact the District Health Office to reactivate it.", code: "HOSPITAL_INACTIVE" });
      }
      hospitalId = hospital.id;
      hospitalName = hospital.name;
    }

    const tokenExpiry = user.role === "user" ? "7d" : "1d";
    const token = generateToken({ ...user, hospitalId }, tokenExpiry);
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

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { city: true },
    });
    if (!user) return res.status(401).json({ error: "Account no longer exists" });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Always answers the same way so the endpoint cannot be used to discover accounts,
// and never returns the token itself — it must reach the account owner out of band.
router.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ error: "Email or phone required" });

    const user = await findUserByIdentifier(identifier);
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.$transaction([
        prisma.passwordResetToken.updateMany({
          where: { userId: user.id, used: false },
          data: { used: true },
        }),
        prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            token: hashResetToken(token),
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
          },
        }),
      ]);
      // TODO: deliver via SMS/email once a provider is configured.
      if (process.env.NODE_ENV !== "production") {
        console.log(`[DEV] Password reset token for user ${user.id}: ${token}`);
      }
    }

    res.json({ message: "If an account exists, password reset instructions will be sent to it." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: "Token and new password required" });
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token: hashResetToken(token) } });
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

// Verifies the token itself (not via authenticate) so accounts that must change
// their temporary password can still reach this endpoint.
router.post("/change-password", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
    let decoded;
    try { decoded = verifyToken(authHeader.split(" ")[1]); } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Both passwords required" });
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "New password must be different from the current one" });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Current password incorrect" });

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
