require("dotenv/config");
const http = require("http");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Add it to backend/.env before starting the server.");
  process.exit(1);
}

const app = require("./app");
const { initSocket } = require("./src/utils/socket");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initSocket(server, app.corsOrigin);

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
