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
function normalizePhone(phone) {
  if (typeof phone !== "string") return null;
  const cleaned = phone.replace(/[\s-]/g, "");
  return /^\+?\d{10,15}$/.test(cleaned) ? cleaned : null;
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
