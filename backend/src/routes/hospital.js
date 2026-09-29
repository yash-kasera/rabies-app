const { Router } = require("express");
const bcrypt = require("bcrypt");
const prisma = require("../utils/prisma");
const { deleteReport, actorOf, logActivity } = require("../utils/activity");
const { generateTempPassword } = require("../utils/passwords");
const { tehsilOf } = require("../utils/tehsil");
const { authenticate, authorize } = require("../middleware/auth");
const { broadcastReportAccepted, broadcastReportRemoved } = require("../utils/socket");
const { auditMiddleware } = require("../middleware/audit");
const { ENUMS, isOneOf, normalizePhone, parseId, parseDate, isValidEmail } = require("../utils/validation");

const router = Router();

router.use(authenticate);
router.use(authorize("hospital"));

// Resolve the caller's hospital once per request and refuse deactivated hospitals,
// so deactivation takes effect immediately rather than when the token expires.
router.use(async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { hospital: true },
    });
    if (!user?.hospital) return res.status(403).json({ error: "No hospital linked to this account" });
    if (user.disabledAt) return res.status(401).json({ error: "This account has been removed" });
    if (user.hospital.deletedAt || user.hospital.status !== "Active") {
      return res.status(403).json({ error: "This hospital has been deactivated" });
    }
    req.hospital = user.hospital;
    req.account = user;
    next();
  } catch (err) {
    console.error("Resolve hospital error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const DOSE_SCHEDULE = [0, 3, 7, 14, 28];

async function createWithDoses(tx, caseId, startDate) {
  const base = startDate || new Date();
  await tx.vaccineDose.createMany({
    data: DOSE_SCHEDULE.map((offset, i) => {
      const scheduledDate = new Date(base);
      scheduledDate.setDate(scheduledDate.getDate() + offset);
      return { caseId, doseNumber: i + 1, scheduledDate };
    }),
  });
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

router.get("/incoming-reports", async (req, res) => {
  try {
    const reports = await prisma.biteReport.findMany({
      where: {
        cityId: req.hospital.cityId,
        status: "Reported",
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(reports.map((r) => ({ ...r, tehsil: tehsilOf(r.latitude, r.longitude) })));
  } catch (err) {
    console.error("Get incoming reports error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reports/:id/accept", auditMiddleware("accept", "BiteReport"), async (req, res) => {
  try {
    const hospitalId = req.hospital.id;
    const reportId = parseId(req.params.id);
    if (!reportId) return res.status(404).json({ error: "Report not found" });

    const case_ = await prisma.$transaction(async (tx) => {
      // Conditional update: only one hospital can move a report out of "Reported",
      // even if several click Accept at the same moment.
      const claimed = await tx.biteReport.updateMany({
        where: { id: reportId, status: "Reported", cityId: req.hospital.cityId },
        data: { status: "Accepted", acceptedByHospitalId: hospitalId },
      });
      if (claimed.count === 0) {
        const existing = await tx.biteReport.findUnique({ where: { id: reportId } });
        if (!existing || existing.cityId !== req.hospital.cityId) throw new HttpError(404, "Report not found");
        throw new HttpError(409, "Report already accepted by another hospital");
      }

      const report = await tx.biteReport.findUnique({ where: { id: reportId } });
      const newCase = await tx.case.create({
        data: {
          biteReportId: report.id,
          hospitalId,
          patientName: report.victimName,
          contactNumber: report.contactNumber,
          address: null,
          incidentDatetime: report.incidentDatetime,
          animalType: report.animalType,
          animalStatus: report.animalStatus,
          severity: report.severity,
          status: "Accepted",
          source: "user_report",
          createdBy: req.user.id,
        },
      });

      await createWithDoses(tx, newCase.id);
      return newCase;
    });

    broadcastReportAccepted(reportId, hospitalId, req.hospital.cityId);

    const result = await prisma.case.findUnique({
      where: { id: case_.id },
      include: { doses: { orderBy: { doseNumber: "asc" } } },
    });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error("Accept report error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cases", auditMiddleware("create", "Case"), async (req, res) => {
  try {
    const hospitalId = req.hospital.id;
    const {
      patientName, contactNumber, address, incidentDatetime,
      animalType, animalStatus, severity, treatmentNotes, handledBy,
    } = req.body;

    if (!patientName?.trim() || !contactNumber || !animalType || !severity) {
      return res.status(400).json({ error: "Required fields missing" });
    }
    const phone = normalizePhone(contactNumber);
    if (!phone) return res.status(400).json({ error: "Enter a valid contact number (10–15 digits)" });
    if (!isOneOf(animalType, ENUMS.animalType)) return res.status(400).json({ error: "Invalid animal type" });
    if (!isOneOf(severity, ENUMS.severity)) return res.status(400).json({ error: "Invalid severity" });
    if (animalStatus && !isOneOf(animalStatus, ENUMS.animalStatus)) {
      return res.status(400).json({ error: "Invalid animal status" });
    }
    const incidentAt = incidentDatetime ? parseDate(incidentDatetime) : new Date();
    if (!incidentAt || incidentAt.getTime() > Date.now() + 5 * 60 * 1000) {
      return res.status(400).json({ error: "Invalid incident date/time" });
    }

    const notes = [treatmentNotes?.trim(), handledBy?.trim() && `Handled by: ${handledBy.trim()}`]
      .filter(Boolean)
      .join("\n") || null;

    const case_ = await prisma.$transaction(async (tx) => {
      const newCase = await tx.case.create({
        data: {
          hospitalId,
          patientName: patientName.trim(),
          contactNumber: phone,
          address: address?.trim() || null,
          incidentDatetime: incidentAt,
          animalType,
          animalStatus: animalStatus || "Unknown",
          severity,
          treatmentNotes: notes,
          status: "Accepted",
          source: "hospital_direct",
          createdBy: req.user.id,
        },
      });

      await createWithDoses(tx, newCase.id);
      return newCase;
    });

    const result = await prisma.case.findUnique({
      where: { id: case_.id },
      include: { doses: { orderBy: { doseNumber: "asc" } } },
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Create case error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cases", async (req, res) => {
  try {
    const hospitalId = req.hospital.id;
    const { status, from, to, search } = req.query;
    const where = { hospitalId };

    if (status) {
      if (!isOneOf(status, ENUMS.caseStatus)) return res.status(400).json({ error: "Invalid status" });
      where.status = status;
    }
    const fromDate = parseDate(from);
    const toDate = parseDate(to);
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      // A bare date means "through the end of that day".
      if (toDate) where.createdAt.lt = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);
    }
    if (search) {
      where.OR = [
        { patientName: { contains: search, mode: "insensitive" } },
        { contactNumber: { contains: search } },
      ];
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [cases, totalThisMonth, underTreatment, completed] = await Promise.all([
      prisma.case.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          doses: { orderBy: { doseNumber: "asc" } },
          biteReport: { select: { id: true, description: true, photoUrl: true, voiceSeconds: true } },
        },
      }),
      prisma.case.count({ where: { hospitalId, createdAt: { gte: startOfMonth } } }),
      prisma.case.count({ where: { hospitalId, status: "UnderTreatment" } }),
      prisma.case.count({ where: { hospitalId, status: "Completed" } }),
    ]);

    res.json({ cases, stats: { totalThisMonth, underTreatment, completed } });
  } catch (err) {
    console.error("Get cases error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cases/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    const case_ = id && await prisma.case.findFirst({
      where: { id, hospitalId: req.hospital.id },
      include: { doses: { orderBy: { doseNumber: "asc" } }, biteReport: true },
    });

    if (!case_) return res.status(404).json({ error: "Case not found" });
    res.json(case_);
  } catch (err) {
    console.error("Get case error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/cases/:id", auditMiddleware("update", "Case"), async (req, res) => {
  try {
    const { status, treatmentNotes, doses } = req.body;
    const caseId = parseId(req.params.id);

    const existing = caseId && await prisma.case.findFirst({
      where: { id: caseId, hospitalId: req.hospital.id },
    });
    if (!existing) return res.status(404).json({ error: "Case not found" });

    if (status !== undefined && !isOneOf(status, ENUMS.caseStatus)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    if (doses !== undefined && !Array.isArray(doses)) {
      return res.status(400).json({ error: "doses must be an array" });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (treatmentNotes !== undefined) updateData.treatmentNotes = treatmentNotes;

    await prisma.$transaction(async (tx) => {
      await tx.case.update({ where: { id: caseId }, data: updateData });

      // Keep the citizen-facing report in step with the case so the app shows progress.
      if (status && existing.biteReportId) {
        await tx.biteReport.update({ where: { id: existing.biteReportId }, data: { status } });
      }

      for (const dose of doses || []) {
        const givenDate = dose.givenDate ? parseDate(dose.givenDate) : null;
        const scheduledDate = dose.scheduledDate ? parseDate(dose.scheduledDate) : undefined;
        if (dose.givenDate && !givenDate) throw new HttpError(400, "Invalid dose given date");
        if (dose.scheduledDate && !scheduledDate) throw new HttpError(400, "Invalid dose scheduled date");

        if (dose.id) {
          // Scoped to this case so a hospital cannot edit doses on another hospital's case.
          // Only touch the fields that were sent, so rescheduling never clears a given date
          // and re-saving doesn't reassign who administered earlier doses.
          const updated = await tx.vaccineDose.updateMany({
            where: { id: parseId(dose.id) || -1, caseId },
            data: {
              ...(scheduledDate && { scheduledDate }),
              ...("givenDate" in dose && { givenDate, givenBy: givenDate ? req.user.id : null }),
            },
          });
          if (updated.count === 0) throw new HttpError(400, "Dose does not belong to this case");
        } else {
          const doseNumber = parseId(dose.doseNumber);
          if (!doseNumber || !scheduledDate) throw new HttpError(400, "New doses need a dose number and scheduled date");
          await tx.vaccineDose.create({
            data: {
              caseId,
              doseNumber,
              scheduledDate,
              givenDate,
              givenBy: givenDate ? req.user.id : null,
            },
          });
        }
      }
    });

    const updated = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        doses: { orderBy: { doseNumber: "asc" } },
        biteReport: { select: { id: true, description: true, photoUrl: true, voiceSeconds: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    console.error("Update case error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete a bite report: one still waiting in this hospital's city, or one this hospital
// accepted. The deletion is recorded in the government's activity log.
router.delete("/reports/:id", auditMiddleware("delete", "BiteReport"), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
    if (!reason) return res.status(400).json({ error: "Give a reason for deleting this report" });
    const report = id && await prisma.biteReport.findUnique({ where: { id } });
    const allowed = report && report.cityId === req.hospital.cityId &&
      (report.status === "Reported" || report.acceptedByHospitalId === req.hospital.id);
    if (!allowed) return res.status(404).json({ error: "Report not found" });

    const deleted = await deleteReport(id, req.user.id, reason);
    if (deleted) broadcastReportRemoved(deleted.id, deleted.cityId);
    res.json({ deleted: true, id });
  } catch (err) {
    console.error("Hospital delete report error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------- staff accounts
// The hospital's admin account (created by the government) adds and removes staff.
// Staff accounts cannot add more staff.
const requireHospitalAdmin = (req, res, next) =>
  req.account.isAdmin ? next() : res.status(403).json({ error: "Only the hospital admin can manage staff" });

const STAFF_FIELDS = { id: true, fullName: true, email: true, phoneNumber: true, isAdmin: true, mustChangePassword: true, createdAt: true };

router.get("/staff", async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { hospitalId: req.hospital.id, role: "hospital", disabledAt: null },
      select: STAFF_FIELDS,
      orderBy: [{ isAdmin: "desc" }, { createdAt: "asc" }],
    });
    res.json(staff.map((s) => ({ ...s, phoneNumber: s.phoneNumber === s.email ? null : s.phoneNumber })));
  } catch (err) {
    console.error("Get hospital staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/staff", requireHospitalAdmin, auditMiddleware("create", "HospitalStaff"), async (req, res) => {
  try {
    const { fullName, email, phoneNumber } = req.body;
    if (!fullName?.trim() || !email) return res.status(400).json({ error: "Full name and email are required" });
    const login = String(email).trim().toLowerCase();
    if (!isValidEmail(login)) return res.status(400).json({ error: "Enter a valid email address" });
    const phone = phoneNumber ? normalizePhone(phoneNumber) : null;
    if (phoneNumber && !phone) return res.status(400).json({ error: "Enter a valid mobile number (10–15 digits)" });

    const taken = await prisma.user.findFirst({
      where: { OR: [{ phoneNumber: login }, { email: { equals: login, mode: "insensitive" } }, ...(phone ? [{ phoneNumber: phone }] : [])] },
    });
    if (taken) return res.status(409).json({ error: "That email or mobile number is already in use" });

    const tempPassword = generateTempPassword();
    const staff = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: login,
        phoneNumber: phone || login,
        passwordHash: await bcrypt.hash(tempPassword, 10),
        role: "hospital",
        cityId: req.hospital.cityId,
        hospitalId: req.hospital.id,
        isAdmin: false,
        mustChangePassword: true,
      },
    });
    res.status(201).json({ id: staff.id, fullName: staff.fullName, email: staff.email, tempPassword });
  } catch (err) {
    console.error("Create hospital staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function findOwnStaff(req, res) {
  const id = parseId(req.params.id);
  if (id === req.user.id) {
    res.status(400).json({ error: "You cannot do this to your own account" });
    return null;
  }
  const staff = id && await prisma.user.findFirst({ where: { id, hospitalId: req.hospital.id, role: "hospital", disabledAt: null } });
  if (!staff) {
    res.status(404).json({ error: "Staff account not found" });
    return null;
  }
  if (staff.isAdmin) {
    res.status(403).json({ error: "The hospital admin account is managed by the government" });
    return null;
  }
  return staff;
}

router.post("/staff/:id/reset-password", requireHospitalAdmin, auditMiddleware("reset-password", "HospitalStaff"), async (req, res) => {
  try {
    const staff = await findOwnStaff(req, res);
    if (!staff) return;
    const tempPassword = generateTempPassword();
    await prisma.user.update({
      where: { id: staff.id },
      data: { passwordHash: await bcrypt.hash(tempPassword, 10), mustChangePassword: true },
    });
    res.json({ email: staff.email, tempPassword });
  } catch (err) {
    console.error("Reset hospital staff password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Removing staff disables the login (the account stays for the audit trail) and frees the email.
router.delete("/staff/:id", requireHospitalAdmin, auditMiddleware("remove", "HospitalStaff"), async (req, res) => {
  try {
    const staff = await findOwnStaff(req, res);
    if (!staff) return;
    const actor = await actorOf(req.user.id);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: staff.id },
        data: { disabledAt: new Date(), email: null, phoneNumber: `removed-${staff.id}`, fcmToken: null },
      }),
      logActivity(prisma, {
        action: "staff_removed", ...actor,
        subject: `${staff.fullName} (${staff.email})`,
        details: { userId: staff.id, email: staff.email, hospital: req.hospital.name },
      }),
    ]);
    res.json({ removed: true });
  } catch (err) {
    console.error("Remove hospital staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

