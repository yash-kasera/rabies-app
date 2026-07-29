const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function auditLog(userId, action, entity, entityId, details, ipAddress) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId, details, ipAddress },
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}

function auditMiddleware(action, entity) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode < 400 && req.user) {
        auditLog(
          req.user.id,
          action,
          entity,
          req.params.id ? parseInt(req.params.id) : body?.id || null,
          JSON.stringify({ method: req.method, path: req.originalUrl }),
          req.ip
        );
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { auditLog, auditMiddleware };