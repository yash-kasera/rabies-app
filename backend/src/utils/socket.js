const { Server } = require("socket.io");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-hospital-room", (hospitalId) => {
      socket.join(`hospital-${hospitalId}`);
    });

    socket.on("join-city-room", (cityId) => {
      socket.join(`city-${cityId}`);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

function broadcastNewReport(report, cityId) {
  if (io) {
    io.to(`city-${cityId}`).emit("new-report", report);
  }
}

function broadcastReportAccepted(reportId, hospitalId, cityId) {
  if (io) {
    io.to(`city-${cityId}`).emit("report-accepted", { reportId, hospitalId });
  }
}

module.exports = { initSocket, getIO, broadcastNewReport, broadcastReportAccepted };