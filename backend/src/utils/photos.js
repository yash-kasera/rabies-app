const fs = require("fs");
const path = require("path");

// Wound photos and voice notes are medical data. New uploads are stored in the
// report_media table and only served through authenticated /api/v1/reports/:id/* routes.
// Older photos may still be files in PHOTO_DIR (photoUrl = file name).
const PHOTO_DIR = process.env.PHOTO_DIR || path.join(__dirname, "../../storage/report-photos");
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_VOICE_BYTES = 3 * 1024 * 1024;
const MAX_VOICE_SECONDS = 120;
/** photoUrl marker for a photo kept in report_media. */
const DB_PHOTO = "db";

const PHOTO_TYPES = [
  { mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", test: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
];

const VOICE_TYPES = [
  // AAC in MP4 (.m4a) from Android/iOS
  { mime: "audio/mp4", test: (b) => b.toString("ascii", 4, 8) === "ftyp" },
  // Opus in WebM from Chrome/Edge/Firefox (web app)
  { mime: "audio/webm", test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  { mime: "audio/ogg", test: (b) => b.toString("ascii", 0, 4) === "OggS" },
  { mime: "audio/wav", test: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WAVE" },
];

function decodeBase64(input) {
  const base64 = input.replace(/^data:[^;]+;base64,/, "");
  if (!/^[A-Za-z0-9+/=\s]+$/.test(base64)) return null;
  return Buffer.from(base64, "base64");
}

/**
 * Decodes a base64 photo (optionally a data: URL) and checks its real file type.
 * Returns { buffer, mime } or { error }.
 */
function decodePhoto(input) {
  if (typeof input !== "string" || !input) return { error: "A photo of the wound is required" };
  const buffer = decodeBase64(input);
  if (!buffer || buffer.length < 100) return { error: "Photo could not be read" };
  if (buffer.length > MAX_PHOTO_BYTES) return { error: "Photo is too large (max 5 MB)" };
  const type = PHOTO_TYPES.find((t) => t.test(buffer));
  if (!type) return { error: "Photo must be a JPEG, PNG or WebP image" };
  return { buffer, mime: type.mime };
}

/** Optional voice note. Returns null when absent, { buffer, mime, seconds } or { error }. */
function decodeVoice(input, seconds) {
  if (input === undefined || input === null || input === "") return null;
  if (typeof input !== "string") return { error: "Voice note could not be read" };
  const buffer = decodeBase64(input);
  if (!buffer || buffer.length < 100) return { error: "Voice note could not be read" };
  if (buffer.length > MAX_VOICE_BYTES) return { error: "Voice note is too long (max 2 minutes)" };
  const type = VOICE_TYPES.find((t) => t.test(buffer));
  if (!type) return { error: "Voice note format is not supported" };
  const secs = Math.round(Number(seconds));
  const safeSeconds = Number.isFinite(secs) && secs > 0 ? Math.min(secs, MAX_VOICE_SECONDS) : null;
  return { buffer, mime: type.mime, seconds: safeSeconds };
}

/** Absolute path for a legacy photo file; rejects anything that isn't one of ours. */
function legacyPhotoPath(name) {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name || "")) return null;
  const file = path.join(PHOTO_DIR, name);
  return fs.existsSync(file) ? file : null;
}

const MIME_BY_EXT = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

module.exports = { decodePhoto, decodeVoice, legacyPhotoPath, MIME_BY_EXT, DB_PHOTO, MAX_VOICE_SECONDS };
