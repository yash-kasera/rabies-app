const fs = require("fs");
const path = require("path");
const { Router } = require("express");
const prisma = require("../utils/prisma");
const { authenticate } = require("../middleware/auth");
const { legacyPhotoPath, MIME_BY_EXT, DB_PHOTO } = require("../utils/photos");
const { parseId } = require("../utils/validation");

const router = Router();

router.use(authenticate);

// Who may see a report's photo or hear its voice note: the citizen who reported it,
// government staff, and staff of an active hospital in the report's city.
async function canView(user, report) {
  if (user.role === "government") return true;
  if (user.role === "user") return report.userId === user.id;
  if (user.role === "hospital") {
    const account = await prisma.user.findUnique({ where: { id: user.id }, include: { hospital: true } });
    const h = account?.hospital;
    return !!h && h.status === "Active" && (h.cityId === report.cityId || report.acceptedByHospitalId === h.id);
  }
  return false;
}

const PRIVATE = { "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" };

async function sendMedia(req, res, kind) {
  const label = kind === "photo" ? "Photo" : "Voice note";
  try {
    const id = parseId(req.params.id);
    const report = id && await prisma.biteReport.findUnique({ where: { id } });
    if (!report || !(await canView(req.user, report))) return res.status(404).json({ error: `${label} not found` });

    if (kind === "photo" && report.photoUrl && report.photoUrl !== DB_PHOTO) {
      const file = legacyPhotoPath(report.photoUrl);
      if (!file) return res.status(404).json({ error: "Photo not found" });
      res.set({ "Content-Type": MIME_BY_EXT[path.extname(file).slice(1)], ...PRIVATE });
      return fs.createReadStream(file).pipe(res);
    }

    const media = await prisma.reportMedia.findUnique({ where: { reportId_kind: { reportId: id, kind } } });
    if (!media) return res.status(404).json({ error: `${label} not found` });
    res.set({ "Content-Type": media.mime, "Content-Length": media.data.length, ...PRIVATE });
    res.end(Buffer.from(media.data));
  } catch (err) {
    console.error(`Get report ${kind} error:`, err);
    res.status(500).json({ error: "Internal server error" });
  }
}

router.get("/:id/photo", (req, res) => sendMedia(req, res, "photo"));
router.get("/:id/voice", (req, res) => sendMedia(req, res, "voice"));

module.exports = router;
