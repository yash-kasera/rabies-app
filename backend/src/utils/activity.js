const prisma = require("./prisma");
const { tehsilOf } = require("./tehsil");

const reportNumber = (id) => `RR-${String(id).padStart(4, "0")}`;

/** Who did it, as stored text (kept even if the account is later removed). */
async function actorOf(userId) {
  const u = await prisma.user.findUnique({ where: { id: userId }, include: { hospital: true } });
  return {
    actorName: u?.fullName || `User ${userId}`,
    actorRole: u?.role === "government" ? (u.isAdmin ? "government_admin" : "government") : u?.role === "hospital" ? (u.isAdmin ? "hospital_admin" : "hospital_staff") : u?.role || "unknown",
    hospitalName: u?.hospital?.name || null,
  };
}

function logActivity(tx, entry) {
  return tx.activityLog.create({ data: entry });
}

/**
 * Deletes a bite report with its photo/voice note, and its case and vaccine doses
 * if a hospital had accepted it. A text snapshot is kept in the activity log.
 * Returns the deleted report's { id, cityId }.
 */
async function deleteReport(reportId, actorId, reason) {
  const actor = await actorOf(actorId);
  return prisma.$transaction(async (tx) => {
    const report = await tx.biteReport.findUnique({
      where: { id: reportId },
      include: { hospital: { select: { name: true } }, case_: { include: { doses: true } } },
    });
    if (!report) return null;

    if (report.case_) {
      await tx.vaccineDose.deleteMany({ where: { caseId: report.case_.id } });
      await tx.case.delete({ where: { id: report.case_.id } });
    }
    await tx.biteReport.delete({ where: { id: reportId } }); // media rows cascade

    await logActivity(tx, {
      action: "report_deleted",
      ...actor,
      subject: `${reportNumber(report.id)} · ${report.victimName}`,
      reason: reason || null,
      details: {
        reportId: report.id,
        victimName: report.victimName,
        contactNumber: report.contactNumber,
        animalType: report.animalType,
        severity: report.severity,
        status: report.status,
        reportedAt: report.createdAt,
        tehsil: tehsilOf(report.latitude, report.longitude),
        acceptedBy: report.hospital?.name || null,
        dosesGiven: report.case_ ? report.case_.doses.filter((d) => d.givenDate).length : 0,
      },
    });
    return { id: report.id, cityId: report.cityId };
  });
}

module.exports = { actorOf, logActivity, deleteReport, reportNumber };
