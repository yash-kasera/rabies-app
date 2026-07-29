const express = require("express");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./src/routes/auth");
const userRoutes = require("./src/routes/user");
const hospitalRoutes = require("./src/routes/hospital");
const governmentRoutes = require("./src/routes/government");
const { auditLog } = require("./src/middleware/audit");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/v1/auth", limiter);

app.use((req, res, next) => {
  if (req.user) req.ipAddress = req.ip;
  next();
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/hospital", hospitalRoutes);
app.use("/api/v1/government", governmentRoutes);

app.get("/api/v1/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;