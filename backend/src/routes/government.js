const { Router } = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma = require("../utils/prisma");
const { authenticate, authorize } = require("../middleware/auth");
const { auditMiddleware } = require("../middleware/audit");
const { tehsilOf, TEHSIL_NAMES } = require("../utils/tehsil");
const { distanceKm, round1 } = require("../utils/geo");
const { broadcastReportAccepted } = require("../utils/socket");
const {
  MIN_PASSWORD_LENGTH, ENUMS, isOneOf, normalizePhone, isValidPassword, isValidEmail, parseCoordinate, parseId, parseDate,
} = require("../utils/validation");

const router = Router();

router.use(authenticate);
router.use(authorize("government"));

function generateTempPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

function dateRange(from, to) {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (!fromDate && !toDate) return undefined;
  const range = {};
  if (fromDate) range.gte = fromDate;
  // A bare date means "through the end of that day".
  if (toDate) range.lt = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);
  return range;
}

const ESCALATE_AFTER_MIN = 30;
const OPEN_CASE = ["Accepted", "UnderTreatment"];

function monthBounds() {
  const now = new Date();
  return {
    startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    startOfLastMonth: new Date(now.getFullYear(), now.getMonth() - 1, 1),
  };
}

const withTehsil = (r) => ({ ...r, tehsil: tehsilOf(r.latitude, r.longitude) });

// Dashboard overview: KPIs, per-tehsil figures, escalations and breakdowns.
router.get("/stats", async (req, res) => {
  try {
    const { startOfMonth, startOfLastMonth } = monthBounds();
    const escalateBefore = new Date(Date.now() - ESCALATE_AFTER_MIN * 60 * 1000);

    const [monthReports, lastMonthPoints, openReports, activeCases, completedCases, acceptedCases, activeHospitals, allHospitals] = await Promise.all([
      prisma.biteReport.findMany({
        where: { createdAt: { gte: startOfMonth } },
        select: { latitude: true, longitude: true, animalType: true, status: true, acceptedByHospitalId: true },
      }),
      prisma.biteReport.findMany({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
        select: { latitude: true, longitude: true },
      }),
      prisma.biteReport.findMany({
        where: { status: "Reported" },
        orderBy: { createdAt: "asc" },
        select: { id: true, victimName: true, contactNumber: true, animalType: true, latitude: true, longitude: true, createdAt: true },
      }),
      prisma.case.count({ where: { status: { in: OPEN_CASE } } }),
      prisma.case.count({ where: { status: "Completed" } }),
      prisma.case.findMany({
        where: { source: "user_report", biteReportId: { not: null }, createdAt: { gte: startOfMonth } },
        select: { createdAt: true, biteReport: { select: { createdAt: true } } },
      }),
      prisma.hospital.findMany({ where: { status: "Active" }, select: { latitude: true, longitude: true } }),
      prisma.hospital.findMany({ select: { id: true, name: true } }),
    ]);

    const timed = acceptedCases.filter((c) => c.biteReport);
    const avgAcceptanceMinutes = timed.length
      ? Math.round(timed.reduce((sum, c) => sum + (c.createdAt - c.biteReport.createdAt) / 60000, 0) / timed.length)
      : null;

    const areas = new Map(TEHSIL_NAMES.map((n) => [n, { name: n, count: 0, lastMonth: 0, unaccepted: 0, hospitals: 0 }]));
    const bump = (lat, lng, key) => { const a = areas.get(tehsilOf(lat, lng)); if (a) a[key]++; };
    monthReports.forEach((r) => bump(r.latitude, r.longitude, "count"));
    lastMonthPoints.forEach((r) => bump(r.latitude, r.longitude, "lastMonth"));
    openReports.forEach((r) => bump(r.latitude, r.longitude, "unaccepted"));
    activeHospitals.forEach((h) => bump(h.latitude, h.longitude, "hospitals"));

    const byAnimal = {};
    monthReports.forEach((r) => { byAnimal[r.animalType] = (byAnimal[r.animalType] || 0) + 1; });

    const hospitalName = new Map(allHospitals.map((h) => [h.id, h.name]));
    const byHospital = {};
    let notAccepted = 0;
    monthReports.forEach((r) => {
      if (r.acceptedByHospitalId) {
        const n = hospitalName.get(r.acceptedByHospitalId) || "Unknown hospital";
        byHospital[n] = (byHospital[n] || 0) + 1;
      } else if (r.status === "Reported") notAccepted++;
    });

    res.json({
      reportsThisMonth: monthReports.length,
      activeCases,
      completedCases,
      unacceptedReports: openReports.length,
      avgAcceptanceMinutes,
      areas: [...areas.values()].sort((a, b) => b.count - a.count),
      escalations: openReports
        .filter((r) => r.createdAt < escalateBefore)
        .map((r) => ({ ...withTehsil(r), minutesWaiting: Math.floor((Date.now() - r.createdAt) / 60000) })),
      casesByAnimal: Object.entries(byAnimal).map(([animalType, count]) => ({ animalType, count })).sort((a, b) => b.count - a.count),
      casesByHospital: [
        ...Object.entries(byHospital).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        ...(notAccepted ? [{ name: null, count: notAccepted }] : []),
      ],
    });
  } catch (err) {
    console.error("Get stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reports table: filters incl. tehsil, 25 per page.
router.get("/cases", auditMiddleware("read", "Case"), async (req, res) => {
  try {
    const { city, hospital, status, from, to, tehsil } = req.query;
    const cityId = parseId(city);
    const hospitalId = parseId(hospital);
    const page = parseId(req.query.page) || 1;
    const pageSize = Math.min(parseId(req.query.pageSize) || 25, 100);
    if (status && !isOneOf(status, ENUMS.reportStatus)) return res.status(400).json({ error: "Invalid status" });
    if (tehsil && !TEHSIL_NAMES.includes(tehsil)) return res.status(400).json({ error: "Invalid tehsil" });
    const createdAt = dateRange(from, to);

    const where = {
      ...(cityId && { cityId }),
      ...(hospitalId && { acceptedByHospitalId: hospitalId }),
      ...(status && { status }),
      ...(createdAt && { createdAt }),
    };
    const select = {
      id: true, victimName: true, contactNumber: true, latitude: true, longitude: true, animalType: true,
      severity: true, status: true, createdAt: true, city: { select: { name: true } }, hospital: { select: { name: true } },
    };

    let total, reports;
    if (tehsil) {
      // Tehsil isn't stored, so filter in memory (fine at district volumes).
      const all = (await prisma.biteReport.findMany({ where, orderBy: { createdAt: "desc" }, select }))
        .map(withTehsil).filter((r) => r.tehsil === tehsil);
      total = all.length;
      reports = all.slice((page - 1) * pageSize, page * pageSize);
    } else {
      [total, reports] = await Promise.all([
        prisma.biteReport.count({ where }),
        prisma.biteReport.findMany({ where, orderBy: { createdAt: "desc" }, select, skip: (page - 1) * pageSize, take: pageSize }),
      ]);
      reports = reports.map(withTehsil);
    }

    res.json({ reports, total, page, pageSize });
  } catch (err) {
    console.error("Get all cases error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Minimal points for the "Report locations" map layer (this month, capped).
router.get("/report-points", async (req, res) => {
  try {
    const { startOfMonth } = monthBounds();
    const points = await prisma.biteReport.findMany({
      where: { createdAt: { gte: startOfMonth } },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, victimName: true, animalType: true, status: true, latitude: true, longitude: true },
    });
    res.json(points.map(withTehsil));
  } catch (err) {
    console.error("Get report points error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function nearestHospitals(report, limit = 4) {
  const hospitals = await prisma.hospital.findMany({
    where: { status: "Active", cityId: report.cityId },
    select: {
      id: true, name: true, address: true, contactNumber: true, latitude: true, longitude: true,
      _count: { select: { cases: { where: { status: { in: OPEN_CASE } } } } },
    },
  });
  return hospitals
    .map((h) => ({
      id: h.id, name: h.name, address: h.address, contactNumber: h.contactNumber, openCases: h._count.cases,
      distanceKm: round1(distanceKm(report.latitude, report.longitude, h.latitude, h.longitude)),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

// Case detail for one bite report.
router.get("/reports/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    const report = id && await prisma.biteReport.findUnique({
      where: { id },
      include: {
        city: true,
        user: { select: { fullName: true, phoneNumber: true } },
        hospital: { select: { id: true, name: true, address: true, contactNumber: true } },
        case_: {
          include: {
            doses: { orderBy: { doseNumber: "asc" } },
            creator: { select: { fullName: true, role: true } },
          },
        },
      },
    });
    if (!report) return res.status(404).json({ error: "Report not found" });

    const { photoUrl, ...rest } = report;
    res.json({
      ...withTehsil(rest),
      hasPhoto: !!photoUrl,
      minutesWaiting: report.status === "Reported" ? Math.floor((Date.now() - report.createdAt) / 60000) : null,
      nearestHospitals: report.status === "Reported" ? await nearestHospitals(report) : [],
    });
  } catch (err) {
    console.error("Get report detail error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// A government officer assigns an unaccepted report to a hospital.
router.post("/reports/:id/assign", auditMiddleware("assign", "BiteReport"), async (req, res) => {
  try {
    const reportId = parseId(req.params.id);
    const hospitalId = parseId(req.body.hospitalId);
    if (!reportId || !hospitalId) return res.status(400).json({ error: "Report and hospital are required" });

    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital || hospital.status !== "Active") return res.status(400).json({ error: "Choose an active hospital" });

    const newCase = await prisma.$transaction(async (tx) => {
      // Same conditional update as a hospital accepting, so the two can't both win.
      const claimed = await tx.biteReport.updateMany({
        where: { id: reportId, status: "Reported", cityId: hospital.cityId },
        data: { status: "Accepted", acceptedByHospitalId: hospitalId },
      });
      if (claimed.count === 0) {
        const existing = await tx.biteReport.findUnique({ where: { id: reportId } });
        const err = new Error(!existing ? "Report not found"
          : existing.cityId !== hospital.cityId ? "That hospital is in a different city" : "Report was already accepted");
        err.status = existing ? 409 : 404;
        throw err;
      }
      const report = await tx.biteReport.findUnique({ where: { id: reportId } });
      const created = await tx.case.create({
        data: {
          biteReportId: report.id, hospitalId,
          patientName: report.victimName, contactNumber: report.contactNumber,
          incidentDatetime: report.incidentDatetime, animalType: report.animalType,
          animalStatus: report.animalStatus, severity: report.severity,
          status: "Accepted", source: "user_report", createdBy: req.user.id,
        },
      });
      await tx.vaccineDose.createMany({
        data: [0, 3, 7, 14, 28].map((offset, i) => {
          const d = new Date();
          d.setDate(d.getDate() + offset);
          return { caseId: created.id, doseNumber: i + 1, scheduledDate: d };
        }),
      });
      return created;
    });

    broadcastReportAccepted(reportId, hospitalId, hospital.cityId);
    res.status(201).json({ id: reportId, hospital: { id: hospital.id, name: hospital.name }, caseId: newCase.id });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error("Assign report error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Real audience sizes for the notification composer.
router.get("/audience", async (req, res) => {
  try {
    const cityId = parseId(req.query.cityId);
    const [all, city] = await Promise.all([
      prisma.user.count({ where: { role: "user" } }),
      cityId ? prisma.user.count({ where: { role: "user", cityId } }) : Promise.resolve(null),
    ]);
    res.json({ all, city });
  } catch (err) {
    console.error("Get audience error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/hospitals", async (req, res) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      orderBy: { name: "asc" },
      include: {
        city: true,
        _count: { select: { cases: true } },
        cases: { where: { status: { in: OPEN_CASE } }, select: { id: true } },
        accounts: { where: { role: "hospital" }, select: { id: true, email: true, mustChangePassword: true } },
      },
    });
    res.json(hospitals.map(({ cases, ...h }) => ({ ...h, openCases: cases.length, tehsil: tehsilOf(h.latitude, h.longitude) })));
  } catch (err) {
    console.error("Get hospitals error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/hospitals/:id/cases", async (req, res) => {
  try {
    const hospitalId = parseId(req.params.id);
    const hospital = hospitalId && await prisma.hospital.findUnique({
      where: { id: hospitalId },
      include: { city: true },
    });
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });

    const cases = await prisma.case.findMany({
      where: { hospitalId },
      orderBy: { createdAt: "desc" },
      include: { doses: { orderBy: { doseNumber: "asc" } }, creator: { select: { fullName: true } } },
    });
    res.json({ hospital, cases });
  } catch (err) {
    console.error("Get hospital cases error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/hospitals", auditMiddleware("create", "Hospital"), async (req, res) => {
  try {
    const { name, cityId, address, latitude, longitude, contactNumber, contactEmail, staffEmail, staffPassword } = req.body;

    const lat = parseCoordinate(latitude, 90);
    const lng = parseCoordinate(longitude, 180);
    if (!name?.trim() || !cityId || !address?.trim() || !contactNumber?.trim()) {
      return res.status(400).json({ error: "Required fields missing" });
    }
    if (lat === null || lng === null) return res.status(400).json({ error: "A valid location is required" });
    if (contactEmail && !isValidEmail(contactEmail)) return res.status(400).json({ error: "Invalid contact email" });
    if (staffEmail && !isValidEmail(staffEmail)) return res.status(400).json({ error: "Invalid login email" });
    if (staffPassword && !isValidPassword(staffPassword)) {
      return res.status(400).json({ error: `Temporary password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const city = parseId(cityId) && await prisma.city.findUnique({ where: { id: parseId(cityId) } });
    if (!city) return res.status(400).json({ error: "Select a valid city" });

    const requestedLogin = staffEmail?.trim().toLowerCase();
    if (requestedLogin) {
      const taken = await prisma.user.findFirst({
        where: { OR: [{ phoneNumber: requestedLogin }, { email: { equals: requestedLogin, mode: "insensitive" } }] },
      });
      if (taken) return res.status(409).json({ error: "That login email is already in use" });
    }

    const loginPassword = staffPassword || generateTempPassword();
    const passwordHash = await bcrypt.hash(loginPassword, 10);

    // Hospital and its login are created together, so a failure never leaves an orphan hospital.
    const { hospital, loginEmail } = await prisma.$transaction(async (tx) => {
      const hospital = await tx.hospital.create({
        data: {
          name: name.trim(),
          cityId: city.id,
          address: address.trim(),
          latitude: lat,
          longitude: lng,
          contactNumber: contactNumber.trim(),
          contactEmail: contactEmail?.trim() || null,
          createdBy: req.user.id,
        },
      });
      const loginEmail = requestedLogin || `hospital${hospital.id}@rabies-system.local`;
      await tx.user.create({
        data: {
          fullName: `Staff - ${hospital.name}`,
          phoneNumber: loginEmail,
          email: loginEmail,
          passwordHash,
          role: "hospital",
          cityId: city.id,
          hospitalId: hospital.id,
          mustChangePassword: true,
        },
      });
      return { hospital, loginEmail };
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

router.patch("/hospitals/:id", auditMiddleware("update", "Hospital"), async (req, res) => {
  try {
    const hospitalId = parseId(req.params.id);
    const existing = hospitalId && await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!existing) return res.status(404).json({ error: "Hospital not found" });

    const { name, cityId, address, latitude, longitude, contactNumber, contactEmail, status } = req.body;
    const data = {};
    if (name?.trim()) data.name = name.trim();
    if (address?.trim()) data.address = address.trim();
    if (contactNumber?.trim()) data.contactNumber = contactNumber.trim();
    if (contactEmail !== undefined) {
      if (contactEmail && !isValidEmail(contactEmail)) return res.status(400).json({ error: "Invalid contact email" });
      data.contactEmail = contactEmail?.trim() || null;
    }
    if (latitude !== undefined || longitude !== undefined) {
      const lat = parseCoordinate(latitude ?? existing.latitude, 90);
      const lng = parseCoordinate(longitude ?? existing.longitude, 180);
      if (lat === null || lng === null) return res.status(400).json({ error: "Invalid location" });
      data.latitude = lat;
      data.longitude = lng;
    }
    if (cityId !== undefined) {
      const city = parseId(cityId) && await prisma.city.findUnique({ where: { id: parseId(cityId) } });
      if (!city) return res.status(400).json({ error: "Select a valid city" });
      data.cityId = city.id;
    }
    if (status !== undefined) {
      if (!isOneOf(status, ENUMS.hospitalStatus)) return res.status(400).json({ error: "Invalid status" });
      data.status = status;
    }

    const hospital = await prisma.$transaction(async (tx) => {
      const updated = await tx.hospital.update({ where: { id: hospitalId }, data });
      // Staff accounts belong to the hospital's city (used for report routing).
      if (data.cityId) {
        await tx.user.updateMany({ where: { hospitalId, role: "hospital" }, data: { cityId: data.cityId } });
      }
      return updated;
    });
    res.json(hospital);
  } catch (err) {
    console.error("Update hospital error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// There is no SMS/email delivery yet, so a government admin issues a new temporary
// password for hospital staff who are locked out. They must change it on next login.
router.post("/hospitals/:id/reset-staff-password", auditMiddleware("reset-password", "Hospital"), async (req, res) => {
  try {
    const hospitalId = parseId(req.params.id);
    const staff = hospitalId && await prisma.user.findFirst({
      where: { hospitalId, role: "hospital" },
      orderBy: { id: "asc" },
    });
    if (!staff) return res.status(404).json({ error: "No staff account found for this hospital" });

    const tempPassword = generateTempPassword();
    await prisma.user.update({
      where: { id: staff.id },
      data: { passwordHash: await bcrypt.hash(tempPassword, 10), mustChangePassword: true },
    });

    res.json({ staffAccount: { email: staff.email || staff.phoneNumber, tempPassword } });
  } catch (err) {
    console.error("Reset staff password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/notifications", auditMiddleware("send", "Notification"), async (req, res) => {
  try {
    const { title, body, category, targetType, targetCityId } = req.body;

    if (!title?.trim() || !body?.trim() || !category || !targetType) {
      return res.status(400).json({ error: "Required fields missing" });
    }
    if (!isOneOf(category, ENUMS.notificationCategory)) return res.status(400).json({ error: "Invalid category" });
    if (!isOneOf(targetType, ENUMS.notificationTarget)) return res.status(400).json({ error: "Invalid target" });

    let cityId = null;
    if (targetType === "city") {
      const city = parseId(targetCityId) && await prisma.city.findUnique({ where: { id: parseId(targetCityId) } });
      if (!city) return res.status(400).json({ error: "Select a valid city" });
      cityId = city.id;
    }

    const notification = await prisma.notification.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        category,
        targetType,
        targetCityId: cityId,
        sentBy: req.user.id,
      },
      include: { city: true },
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

// Government email domains allowed for staff accounts.
const STAFF_DOMAINS = ["mp.gov.in", "nic.in"];
const isGovEmail = (e) => STAFF_DOMAINS.some((d) => e.endsWith("@" + d) || e.endsWith("." + d));

router.get("/staff", async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { role: "government" },
      select: { id: true, fullName: true, email: true, phoneNumber: true, createdAt: true, mustChangePassword: true },
      orderBy: { createdAt: "asc" },
    });
    // Staff without a mobile number have their email stored as the (unique) login id.
    res.json(staff.map((s) => ({ ...s, phoneNumber: s.phoneNumber === s.email ? null : s.phoneNumber })));
  } catch (err) {
    console.error("Get staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Creates a staff account with a temporary password (shown once; must be changed at first login).
router.post("/staff", auditMiddleware("create", "StaffAccount"), async (req, res) => {
  try {
    const { fullName, email, phoneNumber } = req.body;
    if (!fullName?.trim() || !email) return res.status(400).json({ error: "Full name and email are required" });
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!isValidEmail(normalizedEmail) || !isGovEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Use an @mp.gov.in or @nic.in address" });
    }
    const phone = phoneNumber ? normalizePhone(phoneNumber) : null;
    if (phoneNumber && !phone) return res.status(400).json({ error: "Enter a valid mobile number (10–15 digits)" });

    const taken = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: normalizedEmail },
          { email: { equals: normalizedEmail, mode: "insensitive" } },
          ...(phone ? [{ phoneNumber: phone }] : []),
        ],
      },
    });
    if (taken) return res.status(409).json({ error: "That email or mobile number is already in use" });

    const creator = await prisma.user.findUnique({ where: { id: req.user.id }, select: { cityId: true } });
    const tempPassword = generateTempPassword();
    const staff = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        phoneNumber: phone || normalizedEmail,
        email: normalizedEmail,
        passwordHash: await bcrypt.hash(tempPassword, 10),
        role: "government",
        cityId: creator.cityId,
        phoneVerified: true,
        mustChangePassword: true,
      },
    });

    res.status(201).json({ id: staff.id, fullName: staff.fullName, email: staff.email, tempPassword });
  } catch (err) {
    console.error("Create staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/staff/:id/reset-password", auditMiddleware("reset-password", "StaffAccount"), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: "Use Change password to update your own password" });
    const staff = id && await prisma.user.findFirst({ where: { id, role: "government" } });
    if (!staff) return res.status(404).json({ error: "Staff account not found" });

    const tempPassword = generateTempPassword();
    await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(tempPassword, 10), mustChangePassword: true },
    });
    res.json({ email: staff.email, tempPassword });
  } catch (err) {
    console.error("Reset staff password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
