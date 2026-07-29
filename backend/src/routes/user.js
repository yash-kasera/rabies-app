const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth");
const { broadcastNewReport } = require("../utils/socket");
const { auditMiddleware } = require("../middleware/audit");

const router = Router();
const prisma = new PrismaClient();

const statsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

router.use(authenticate);
router.use(authorize("user"));

router.get("/content", async (req, res) => {
  try {
    const sections = await prisma.contentSection.findMany({ orderBy: { order: "asc" } });
    res.json(sections);
  } catch (err) {
    console.error("Get content error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { targetType: "all" },
          { targetCityId: user.cityId },
        ],
      },
      orderBy: { sentAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    console.error("Get user notifications error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reports", auditMiddleware("create", "BiteReport"), async (req, res) => {
  try {
    const {
      victimName, contactNumber, latitude, longitude, cityId,
      incidentDatetime, animalType, animalStatus, severity,
    } = req.body;

    if (!victimName || !contactNumber || !latitude || !longitude || !cityId || !animalType || !severity) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const report = await prisma.biteReport.create({
      data: {
        userId: req.user.id,
        victimName,
        contactNumber,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        cityId: parseInt(cityId),
        incidentDatetime: incidentDatetime ? new Date(incidentDatetime) : new Date(),
        animalType,
        animalStatus: animalStatus || "Unknown",
        severity,
        status: "Reported",
      },
    });

    broadcastNewReport(report, parseInt(cityId));

    const hospitalCount = await prisma.hospital.count({
      where: { cityId: parseInt(cityId), status: "Active" },
    });

    const hospitals = await prisma.hospital.findMany({
      where: { cityId: parseInt(cityId), status: "Active" },
      select: { id: true, name: true, address: true, latitude: true, longitude: true, contactNumber: true },
    });

    res.status(201).json({ report, notifiedHospitals: hospitalCount, hospitals });
  } catch (err) {
    console.error("Create report error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports", async (req, res) => {
  try {
    const reports = await prisma.biteReport.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { hospital: { select: { name: true } }, city: true },
    });
    res.json(reports);
  } catch (err) {
    console.error("Get reports error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/:id", async (req, res) => {
  try {
    const report = await prisma.biteReport.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user.id },
      include: { hospital: { select: { name: true } }, city: true, case_: { include: { doses: true } } },
    });
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (err) {
    console.error("Get report error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/city-stats", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const cityId = parseInt(req.query.cityId) || user.cityId;
     const cacheKey = `stats-${cityId}`;

    const cached = statsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisMonth, lastMonth, totalCases, hospitalCount, notices] =
      await Promise.all([
        prisma.biteReport.count({
          where: { cityId, createdAt: { gte: startOfMonth } },
        }),
        prisma.biteReport.count({
          where: { cityId, createdAt: { gte: startOfMonth, lt: startOfLastMonth } },
        }),
        prisma.biteReport.count({ where: { cityId } }),
        prisma.hospital.count({
          where: { cityId, status: "Active" },
        }),
        prisma.notification.findMany({
          where: { OR: [{ targetType: "all" }, { targetCityId: cityId }] },
          orderBy: { sentAt: "desc" },
          take: 10,
        }),
      ]);

    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await prisma.biteReport.count({
        where: { cityId, createdAt: { gte: start, lt: end } },
      });
      trend.push({ month: start.toLocaleString("default", { month: "short" }), count });
    }

    const change = lastMonth > 0
      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
      : thisMonth > 0 ? 100 : 0;

    const data = {
      totalCasesThisMonth: thisMonth,
      totalCases: totalCases,
      changePercent: change,
      trend,
      registeredHospitals: hospitalCount,
      activeNotices: notices,
    };

    statsCache.set(cacheKey, { data, timestamp: Date.now() });

    res.json(data);
  } catch (err) {
    console.error("City stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/hospitals", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const cityId = parseInt(req.query.cityId) || user.cityId;

    const hospitals = await prisma.hospital.findMany({
      where: { cityId, status: "Active" },
      select: { id: true, name: true, address: true, latitude: true, longitude: true, contactNumber: true },
    });
    res.json(hospitals);
  } catch (err) {
    console.error("Get hospitals error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
