const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth");
const { getIO } = require("../utils/socket");
const { auditMiddleware } = require("../middleware/audit");

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);
router.use(authorize("hospital"));

async function getHospitalId(userId) {
  const hospital = await prisma.hospital.findFirst({
    where: { accounts: { some: { id: userId } } },
  });
  return hospital?.id;
}

const DOSE_SCHEDULE = [0, 3, 7, 14, 28];

async function createWithDoses(tx, caseId, createdById) {
  for (let i = 0; i < DOSE_SCHEDULE.length; i++) {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + DOSE_SCHEDULE[i]);
    await tx.vaccineDose.create({
      data: {
        caseId,
        doseNumber: i + 1,
        scheduledDate,
      },
    });
  }
}

router.get("/incoming-reports", async (req, res) => {
  try {
    const hospitalId = await getHospitalId(req.user.id);
    if (!hospitalId) return res.status(403).json({ error: "No hospital linked to this account" });

    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });

    const reports = await prisma.biteReport.findMany({
      where: {
        cityId: hospital.cityId,
        status: "Reported",
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(reports);
  } catch (err) {
    console.error("Get incoming reports error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reports/:id/accept", auditMiddleware("accept", "BiteReport"), async (req, res) => {
  try {
    const hospitalId = await getHospitalId(req.user.id);
    if (!hospitalId) return res.status(403).json({ error: "No hospital linked to this account" });

    const report = await prisma.biteReport.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!report) return res.status(404).json({ error: "Report not found" });
    if (report.status !== "Reported") {
      return res.status(409).json({ error: "Report already accepted by another hospital" });
    }

    const case_ = await prisma.$transaction(async (tx) => {
      await tx.biteReport.update({
        where: { id: report.id },
        data: { status: "Accepted", acceptedByHospitalId: hospitalId },
      });

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

      await createWithDoses(tx, newCase.id, req.user.id);
      return newCase;
    });

    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    const io = getIO();
    io.to(`city-${hospital.cityId}`).emit("report-accepted", { reportId: report.id, hospitalId });

    const result = await prisma.case.findUnique({
      where: { id: case_.id },
      include: { doses: true },
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Accept report error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cases", auditMiddleware("create", "Case"), async (req, res) => {
  try {
    const hospitalId = await getHospitalId(req.user.id);
    if (!hospitalId) return res.status(403).json({ error: "No hospital linked to this account" });

    const {
      patientName, contactNumber, address, incidentDatetime,
      animalType, animalStatus, severity, treatmentNotes,
    } = req.body;

    if (!patientName || !contactNumber || !animalType || !severity) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const case_ = await prisma.$transaction(async (tx) => {
      const newCase = await tx.case.create({
        data: {
          hospitalId,
          patientName,
          contactNumber,
          address,
          incidentDatetime: incidentDatetime ? new Date(incidentDatetime) : new Date(),
          animalType,
          animalStatus: animalStatus || "Unknown",
          severity,
          treatmentNotes,
          status: "Accepted",
          source: "hospital_direct",
          createdBy: req.user.id,
        },
      });

      await createWithDoses(tx, newCase.id, req.user.id);
      return newCase;
    });

    const result = await prisma.case.findUnique({
      where: { id: case_.id },
      include: { doses: true },
    });

    res.status(201).json(result);
  } catch (err) {
    console.error("Create case error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cases", async (req, res) => {
  try {
    const hospitalId = await getHospitalId(req.user.id);
    if (!hospitalId) return res.status(403).json({ error: "No hospital linked to this account" });

    const { status, from, to, search } = req.query;
    const where = { hospitalId };

    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { patientName: { contains: search, mode: "insensitive" } },
        { contactNumber: { contains: search } },
      ];
    }

    const cases = await prisma.case.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { doses: true },
    });

    const stats = await Promise.all([
      prisma.case.count({ where: { hospitalId, createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
      prisma.case.count({ where: { hospitalId, status: "UnderTreatment" } }),
      prisma.case.count({ where: { hospitalId, status: "Completed" } }),
    ]);

    res.json({ cases, stats: { totalThisMonth: stats[0], underTreatment: stats[1], completed: stats[2] } });
  } catch (err) {
    console.error("Get cases error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cases/:id", async (req, res) => {
  try {
    const hospitalId = await getHospitalId(req.user.id);
    if (!hospitalId) return res.status(403).json({ error: "No hospital linked" });

    const case_ = await prisma.case.findFirst({
      where: { id: parseInt(req.params.id), hospitalId },
      include: { doses: true, biteReport: true },
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
    const hospitalId = await getHospitalId(req.user.id);
    if (!hospitalId) return res.status(403).json({ error: "No hospital linked" });

    const { status, treatmentNotes, doses } = req.body;
    const caseId = parseInt(req.params.id);

    const existing = await prisma.case.findFirst({
      where: { id: caseId, hospitalId },
    });
    if (!existing) return res.status(404).json({ error: "Case not found" });

    const updateData = {};
    if (status) updateData.status = status;
    if (treatmentNotes !== undefined) updateData.treatmentNotes = treatmentNotes;

    await prisma.$transaction(async (tx) => {
      await tx.case.update({ where: { id: caseId }, data: updateData });

      if (doses && Array.isArray(doses)) {
        for (const dose of doses) {
          if (dose.id) {
            await tx.vaccineDose.update({
              where: { id: dose.id },
              data: {
                givenDate: dose.givenDate ? new Date(dose.givenDate) : null,
                givenBy: dose.givenDate ? req.user.id : null,
              },
            });
          } else {
            await tx.vaccineDose.create({
              data: {
                caseId,
                doseNumber: dose.doseNumber,
                scheduledDate: new Date(dose.scheduledDate),
                givenDate: dose.givenDate ? new Date(dose.givenDate) : null,
                givenBy: dose.givenDate ? req.user.id : null,
              },
            });
          }
        }
      }
    });

    const updated = await prisma.case.findUnique({
      where: { id: caseId },
      include: { doses: true },
    });

    res.json(updated);
  } catch (err) {
    console.error("Update case error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
