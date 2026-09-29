const { Router } = require("express");
const prisma = require("../utils/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const { broadcastNewReport } = require("../utils/socket");
const { tehsilOf, TEHSIL_NAMES } = require("../utils/tehsil");
const { distanceKm } = require("../utils/geo");
const { decodePhoto, decodeVoice, DB_PHOTO } = require("../utils/photos");
const { auditMiddleware } = require("../middleware/audit");
const {
  ENUMS, isOneOf, normalizePhone, parseCoordinate, parseId, parseDate,
} = require("../utils/validation");

const router = Router();

const statsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const HOSPITAL_FIELDS = { id: true, name: true, address: true, latitude: true, longitude: true, contactNumber: true };

router.use(authenticate);
router.use(authorize("user"));

async function getCurrentUser(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) res.status(401).json({ error: "Account no longer exists" });
  return user;
}

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
    const user = await getCurrentUser(req, res);
    if (!user) return;
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
      incidentDatetime, animalType, animalStatus, severity, description, photo, voice, voiceSeconds,
    } = req.body;

    const lat = parseCoordinate(latitude, 90);
    const lng = parseCoordinate(longitude, 180);
    const phone = normalizePhone(contactNumber);

    if (!victimName?.trim() || !contactNumber || !animalType || !severity) {
      return res.status(400).json({ error: "Required fields missing" });
    }
    if (!phone) return res.status(400).json({ error: "Enter a valid contact number (10–15 digits)" });
    if (lat === null || lng === null) return res.status(400).json({ error: "A valid location is required" });
    if (!isOneOf(animalType, ENUMS.animalType)) return res.status(400).json({ error: "Invalid animal type" });
    if (!isOneOf(severity, ENUMS.severity)) return res.status(400).json({ error: "Invalid severity" });
    if (animalStatus && !isOneOf(animalStatus, ENUMS.animalStatus)) {
      return res.status(400).json({ error: "Invalid animal status" });
    }

    let incidentAt = new Date();
    if (incidentDatetime) {
      incidentAt = parseDate(incidentDatetime);
      // Allow a few minutes of device clock skew, but no future incidents.
      if (!incidentAt || incidentAt.getTime() > Date.now() + 5 * 60 * 1000) {
        return res.status(400).json({ error: "Invalid incident date/time" });
      }
    }

    if (description !== undefined && description !== null && typeof description !== "string") {
      return res.status(400).json({ error: "Invalid description" });
    }
    const desc = description?.trim() || null;
    if (desc && desc.length > 1000) return res.status(400).json({ error: "Description is too long (max 1000 characters)" });

    const decoded = decodePhoto(photo);
    if (decoded.error) return res.status(400).json({ error: decoded.error });
    const voiceNote = decodeVoice(voice, voiceSeconds);
    if (voiceNote?.error) return res.status(400).json({ error: voiceNote.error });

    const user = await getCurrentUser(req, res);
    if (!user) return;
    const reportCityId = parseId(cityId) || user.cityId;
    const city = await prisma.city.findUnique({ where: { id: reportCityId } });
    if (!city) return res.status(400).json({ error: "Invalid city" });

    // Report, photo and voice note are written together, so there is never a report without its photo.
    const report = await prisma.biteReport.create({
      data: {
        userId: req.user.id,
        victimName: victimName.trim(),
        contactNumber: phone,
        latitude: lat,
        longitude: lng,
        cityId: city.id,
        incidentDatetime: incidentAt,
        animalType,
        animalStatus: animalStatus || "Unknown",
        severity,
        description: desc,
        photoUrl: DB_PHOTO,
        voiceSeconds: voiceNote ? voiceNote.seconds ?? 0 : null,
        status: "Reported",
        media: {
          create: [
            { kind: "photo", mime: decoded.mime, data: decoded.buffer },
            ...(voiceNote ? [{ kind: "voice", mime: voiceNote.mime, data: voiceNote.buffer }] : []),
          ],
        },
      },
    });

    statsCache.delete(`stats-${city.id}`);
    broadcastNewReport(report, city.id);

    const hospitals = (await prisma.hospital.findMany({
      where: { cityId: city.id, status: "Active" },
      select: HOSPITAL_FIELDS,
    }))
      .map((h) => ({ ...h, distanceKm: Math.round(distanceKm(lat, lng, h.latitude, h.longitude) * 10) / 10 }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.status(201).json({ report, notifiedHospitals: hospitals.length, hospitals });
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
      include: {
        hospital: { select: { name: true, address: true, contactNumber: true } },
        city: true,
        case_: { select: { status: true, doses: { orderBy: { doseNumber: "asc" } } } },
      },
    });
    res.json(reports);
  } catch (err) {
    console.error("Get reports error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(404).json({ error: "Report not found" });
    const report = await prisma.biteReport.findFirst({
      where: { id, userId: req.user.id },
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
    const user = await getCurrentUser(req, res);
    if (!user) return;
    const cityId = parseId(req.query.cityId) || user.cityId;
    const cacheKey = `stats-${cityId}`;

    const cached = statsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const trendMonths = [];
    for (let i = 5; i >= 0; i--) {
      trendMonths.push({
        start: new Date(now.getFullYear(), now.getMonth() - i, 1),
        end: new Date(now.getFullYear(), now.getMonth() - i + 1, 1),
      });
    }

    const [thisMonth, lastMonth, totalCases, hospitalCount, notices, trendCounts, recentPoints] =
      await Promise.all([
        prisma.biteReport.count({
          where: { cityId, createdAt: { gte: startOfMonth } },
        }),
        prisma.biteReport.count({
          where: { cityId, createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
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
        Promise.all(trendMonths.map(({ start, end }) =>
          prisma.biteReport.count({ where: { cityId, createdAt: { gte: start, lt: end } } }))),
        prisma.biteReport.findMany({
          where: { cityId, createdAt: { gte: startOfLastMonth } },
          select: { latitude: true, longitude: true, createdAt: true },
        }),
      ]);

    // Cases per tehsil this month vs last month, from each report's location.
    const areaCounts = new Map(TEHSIL_NAMES.map((n) => [n, { name: n, count: 0, lastMonth: 0 }]));
    for (const r of recentPoints) {
      const area = areaCounts.get(tehsilOf(r.latitude, r.longitude));
      if (!area) continue;
      if (r.createdAt >= startOfMonth) area.count++;
      else area.lastMonth++;
    }
    const areas = [...areaCounts.values()].sort((a, b) => b.count - a.count);

    const trend = trendMonths.map(({ start }, i) => ({
      month: start.toLocaleString("en-US", { month: "short" }),
      count: trendCounts[i],
    }));

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
      areas,
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
    const user = await getCurrentUser(req, res);
    if (!user) return;
    const cityId = parseId(req.query.cityId) || user.cityId;

    const hospitals = await prisma.hospital.findMany({
      where: { cityId, status: "Active" },
      select: HOSPITAL_FIELDS,
      orderBy: { name: "asc" },
    });
    res.json(hospitals);
  } catch (err) {
    console.error("Get hospitals error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
