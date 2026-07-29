const { Router } = require("express");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth");
const { auditMiddleware } = require("../middleware/audit");

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(authorize("government"));

router.get("/cases", auditMiddleware("read", "Case"), async (req, res) => {
  try {
    const { city, hospital, status, from, to } = req.query;
    const where = {};

    if (city) where.cityId = parseInt(city);
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const biteReports = await prisma.biteReport.findMany({
      where: { ...where, hospitalId: hospital ? parseInt(hospital) : undefined },
      orderBy: { createdAt: "desc" },
      include: { city: true, hospital: { select: { name: true } }, user: { select: { fullName: true } } },
    });

    const cases = await prisma.case.findMany({
      where: { hospitalId: hospital ? parseInt(hospital) : undefined },
      orderBy: { createdAt: "desc" },
      include: { hospital: { select: { name: true } }, doses: true },
    });

    res.json({ biteReports, cases });
  } catch (err) {
    console.error("Get all cases error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/unaccepted", async (req, res) => {
  try {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    const reports = await prisma.biteReport.findMany({
      where: { status: "Reported", createdAt: { lt: thirtyMinAgo } },
      orderBy: { createdAt: "asc" },
      include: { city: true, user: { select: { fullName: true, phoneNumber: true } } },
    });
    res.json(reports);
  } catch (err) {
    console.error("Get unaccepted reports error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalReports, totalCases, completedCases, unacceptedReports] =
      await Promise.all([
        prisma.biteReport.count(),
        prisma.case.count(),
        prisma.case.count({ where: { status: "Completed" } }),
        prisma.biteReport.count({ where: { status: "Reported" } }),
      ]);

    const acceptedCases = await prisma.case.findMany({
      where: { source: "user_report" },
      select: { createdAt: true, biteReport: { select: { createdAt: true } } },
    });

    let avgAcceptanceMinutes = null;
    if (acceptedCases.length > 0) {
      const totalMinutes = acceptedCases.reduce((sum, c) => {
        if (c.biteReport) {
          return sum + (c.createdAt.getTime() - c.biteReport.createdAt.getTime()) / 60000;
        }
        return sum;
      }, 0);
      avgAcceptanceMinutes = Math.round(totalMinutes / acceptedCases.length);
    }

    const casesByCity = await prisma.case.groupBy({
      by: ["hospitalId"],
      _count: { id: true },
    });

    const hospitals = await prisma.hospital.findMany({ select: { id: true, cityId: true } });
    const casesByCityMapped = {};
    for (const entry of casesByCity) {
      const h = hospitals.find((h) => h.id === entry.hospitalId);
      if (h) {
        const cityId = h.cityId;
        casesByCityMapped[cityId] = (casesByCityMapped[cityId] || 0) + entry._count.id;
      }
    }

    const casesByAnimal = await prisma.case.groupBy({
      by: ["animalType"],
      _count: { id: true },
    });

    res.json({
      totalReports,
      totalCases,
      completedCases,
      unacceptedReports,
      avgAcceptanceMinutes,
      casesByCity: casesByCityMapped,
      casesByAnimal: casesByAnimal.map((c) => ({ animalType: c.animalType, count: c._count.id })),
    });
  } catch (err) {
    console.error("Get stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/hospitals", async (req, res) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      orderBy: { name: "asc" },
      include: { city: true, _count: { select: { cases: true } } },
    });
    res.json(hospitals);
  } catch (err) {
    console.error("Get hospitals error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/hospitals/:id/cases", async (req, res) => {
  try {
    const hospitalId = parseInt(req.params.id);
    const cases = await prisma.case.findMany({
      where: { hospitalId },
      orderBy: { createdAt: "desc" },
      include: { doses: true, creator: { select: { fullName: true } } },
    });
    res.json(cases);
  } catch (err) {
    console.error("Get hospital cases error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/hospitals", auditMiddleware("create", "Hospital"), async (req, res) => {
  try {
    const { name, cityId, address, latitude, longitude, contactNumber, contactEmail, staffEmail, staffPassword } = req.body;

    if (!name || !cityId || !address || !latitude || !longitude || !contactNumber) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const hospital = await prisma.hospital.create({
      data: {
        name,
        cityId: parseInt(cityId),
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        contactNumber,
        contactEmail,
        createdBy: req.user.id,
      },
    });

    const loginEmail = staffEmail || `hospital${hospital.id}@rabies-system.local`;
    const loginPassword = staffPassword || crypto.randomBytes(4).toString("hex");
    const passwordHash = await bcrypt.hash(loginPassword, 10);

    const staffUser = await prisma.user.create({
      data: {
        fullName: `Staff - ${name}`,
        phoneNumber: loginEmail,
        email: loginEmail,
        passwordHash,
        role: "hospital",
        cityId: parseInt(cityId),
        hospitalId: hospital.id,
        mustChangePassword: true,
      },
    });

    res.status(201).json({
      hospital,
      staffAccount: { email: loginEmail, tempPassword: loginPassword },
    });
  } catch (err) {
    console.error("Create hospital error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const crypto = require("crypto");

router.patch("/hospitals/:id", auditMiddleware("update", "Hospital"), async (req, res) => {
  try {
    const { name, cityId, address, latitude, longitude, contactNumber, contactEmail, status } = req.body;
    const data = {};
    if (name) data.name = name;
    if (cityId) data.cityId = parseInt(cityId);
    if (address) data.address = address;
    if (latitude) data.latitude = parseFloat(latitude);
    if (longitude) data.longitude = parseFloat(longitude);
    if (contactNumber) data.contactNumber = contactNumber;
    if (contactEmail !== undefined) data.contactEmail = contactEmail;
    if (status) data.status = status;

    const hospital = await prisma.hospital.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json(hospital);
  } catch (err) {
    console.error("Update hospital error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications", auditMiddleware("send", "Notification"), async (req, res) => {
  try {
    const { title, body, category, targetType, targetCityId } = req.body;

    if (!title || !body || !category || !targetType) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        body,
        category,
        targetType,
        targetCityId: targetCityId ? parseInt(targetCityId) : null,
        sentBy: req.user.id,
      },
    });

    res.status(201).json(notification);
  } catch (err) {
    console.error("Create notification error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { sentAt: "desc" },
      include: { city: true },
    });
    res.json(notifications);
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/staff", async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { role: "government" },
      select: { id: true, fullName: true, email: true, phoneNumber: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(staff);
  } catch (err) {
    console.error("Get staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/staff", auditMiddleware("create", "StaffAccount"), async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "fullName, email, and password required" });
    }

    const existing = await prisma.user.findUnique({ where: { phoneNumber: email } });
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const staff = await prisma.user.create({
      data: {
        fullName,
        phoneNumber: email,
        email,
        passwordHash,
        role: "government",
        cityId: 1,
        phoneVerified: true,
      },
    });

    res.status(201).json({ id: staff.id, fullName: staff.fullName, email: staff.email });
  } catch (err) {
    console.error("Create staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;