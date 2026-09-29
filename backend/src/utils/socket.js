const { Server } = require("socket.io");
const prisma = require("./prisma");
const { verifyToken } = require("../middleware/auth");

let io;

const GOVERNMENT_ROOM = "government";

function initSocket(server, corsOrigin = "*") {
  io = new Server(server, {
    cors: { origin: corsOrigin, methods: ["GET", "POST"] },
  });

  // Reports carry victim names, phone numbers and locations, so only
  // authenticated hospital and government accounts may connect.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = verifyToken(token);
      if (decoded.mustChangePassword) return next(new Error("Password change required"));

      if (decoded.role === "hospital") {
        const hospital = decoded.hospitalId
          ? await prisma.hospital.findUnique({ where: { id: decoded.hospitalId } })
          : null;
        if (!hospital || hospital.status !== "Active") return next(new Error("Hospital not active"));
        socket.data.rooms = [`hospital-${hospital.id}`, `city-${hospital.cityId}`];
      } else if (decoded.role === "government") {
        socket.data.rooms = [GOVERNMENT_ROOM];
      } else {
        return next(new Error("Not permitted"));
      }
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    // Rooms are assigned server-side from the verified token; clients cannot pick them.
    socket.join(socket.data.rooms);
  });

  return io;
}

function broadcastNewReport(report, cityId) {
  if (!io) return;
  io.to(`city-${cityId}`).to(GOVERNMENT_ROOM).emit("new-report", report);
}

function broadcastReportAccepted(reportId, hospitalId, cityId) {
  if (!io) return;
  io.to(`city-${cityId}`).to(GOVERNMENT_ROOM).emit("report-accepted", { reportId, hospitalId });
}

module.exports = { initSocket, broadcastNewReport, broadcastReportAccepted };
