const jwt = require("jsonwebtoken");

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = header.split(" ")[1];
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  // Accounts issued a temporary password may only change it until they do.
  if (decoded.mustChangePassword) {
    return res.status(403).json({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" });
  }
  req.user = decoded;
  next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { authenticate, authorize, verifyToken };
