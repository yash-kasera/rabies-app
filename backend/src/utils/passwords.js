const crypto = require("crypto");

/** 12-character random temporary password (shown once; must be changed at first login). */
function generateTempPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

module.exports = { generateTempPassword };
