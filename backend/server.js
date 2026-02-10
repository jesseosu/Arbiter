const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server: SocketServer } = require("socket.io");

const { createHub } = require("./src/websocket/hub");
const { setHub, startGenerator, getQueueDepth } = require("./src/data/contentStore");
const { requestId } = require("./src/middleware/rateLimiter");

const contentRoutes  = require("./src/routes/content");
const actionsRoutes  = require("./src/routes/actions");
const rulesRoutes    = require("./src/routes/rules");
const appealsRoutes  = require("./src/routes/appeals");
const metricsRoutes  = require("./src/routes/metrics");

const app    = express();
const server = http.createServer(app);
const io     = new SocketServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());
app.use(requestId);

app.use("/api/content",  contentRoutes);
app.use("/api/actions",  actionsRoutes);
app.use("/api/rules",    rulesRoutes);
app.use("/api/appeals",  appealsRoutes);
app.use("/api/metrics",  metricsRoutes);

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", queueDepth: getQueueDepth() })
);

const hub = createHub(io);
setHub(hub);

// Push a metrics snapshot every 5 s to all connected clients
setInterval(() => {
  hub.emit("metrics:tick", { queueDepth: getQueueDepth(), ts: Date.now() });
}, 5000);

io.on("connection", (socket) => {
  console.log(`[ws] client connected: ${socket.id}`);
  socket.on("disconnect", () =>
    console.log(`[ws] client disconnected: ${socket.id}`)
  );
});

const PORT = process.env.PORT || 4000;

// Ensure data directory exists before initialising the DB
const fs = require("fs");
const path = require("path");
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

server.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
  startGenerator();
});

module.exports = { app, server };
