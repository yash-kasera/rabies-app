require("dotenv/config");
const http = require("http");
const app = require("./app");
const { initSocket } = require("./src/utils/socket");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});