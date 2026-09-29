const MIN_PASSWORD_LENGTH = 8;

const ENUMS = {
  animalType: ["Dog", "Cat", "Monkey", "Bat", "Other"],
  animalStatus: ["LookedHealthy", "LookedSickOrAggressive", "Stray", "OwnedAndVaccinated", "Unknown"],
  severity: ["MinorScratch", "BleedingWound", "DeepWound", "MultipleBites"],
  reportStatus: ["Reported", "Accepted", "UnderTreatment", "Completed", "Cancelled"],
  caseStatus: ["Accepted", "UnderTreatment", "Completed", "Cancelled"],
  hospitalStatus: ["Active", "Inactive"],
  notificationCategory: ["OutbreakAlert", "GeneralAwareness", "NewHospital", "MaintenanceNotice"],
  notificationTarget: ["all", "city"],
};

function isOneOf(value, list) {
  return typeof value === "string" && list.includes(value);
}

function isValidPassword(password) {
  return typeof password === "string" && password.length >= MIN_PASSWORD_LENGTH;
}

// Accepts 10–15 digits with an optional leading "+" (spaces and dashes ignored).
/**
 * One stored form per phone number, however it was typed. Indian numbers become their
 * 10 digits: "+91 98260 12345", "919826012345", "09826012345" and "98260-12345" are all
 * "9826012345". Other international numbers keep a leading "+". Returns null if invalid.
 */
function normalizePhone(phone) {
  if (typeof phone !== "string") return null;
  let t = phone.trim().replace(/[\s\-().]/g, "");
  if (t.startsWith("00")) t = `+${t.slice(2)}`; // 0091… is the same as +91…
  if (!/^\+?\d+$/.test(t)) return null;
  const plus = t.startsWith("+");
  const digits = t.replace(/^\+/, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2); // +91 / 91 prefix
  if (!plus && digits.length === 11 && digits.startsWith("0")) return digits.slice(1); // trunk 0
  if (digits.length < 10 || digits.length > 15) return null;
  return plus && digits.length > 10 ? `+${digits}` : digits;
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseCoordinate(value, max) {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) && Math.abs(n) <= max ? n : null;
}

function parseId(value) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  ENUMS,
  isOneOf,
  isValidPassword,
  normalizePhone,
  isValidEmail,
  parseCoordinate,
  parseId,
  parseDate,
};
