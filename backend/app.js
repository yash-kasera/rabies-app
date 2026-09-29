const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./src/routes/auth");
const cityRoutes = require("./src/routes/cities");
const userRoutes = require("./src/routes/user");
const hospitalRoutes = require("./src/routes/hospital");
const governmentRoutes = require("./src/routes/government");
const reportPhotoRoutes = require("./src/routes/reportPhotos");

// Comma-separated list, e.g. "https://gov.example.in,https://hospital.example.in".
// Unset means any origin (local development only).
const corsOrigin = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : "*";

const app = express();

// Behind a hosting proxy (Render: TRUST_PROXY=1) so rate limits apply per real client IP.
// A number means "trust this many proxy hops"; Express treats a numeric *string* as an IP.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set("trust proxy", Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
}

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "12mb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/v1/auth", limiter);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/cities", cityRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/hospital", hospitalRoutes);
app.use("/api/v1/government", governmentRoutes);
app.use("/api/v1/reports", reportPhotoRoutes);

// Also touches the database, so an uptime pinger keeps a free-tier database from pausing.
app.get("/api/v1/health", async (req, res) => {
  try {
    await require("./src/utils/prisma").$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "database unavailable" });
  }
});

app.corsOrigin = corsOrigin;

module.exports = app;
