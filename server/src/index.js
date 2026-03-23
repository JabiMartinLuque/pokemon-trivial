import express from "express";
import http from "http";
import path from "path";
import cors from "cors";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { registerSocketHandlers } from "./socket/handlers.js";
import { STARTERS, getStarterSpriteUrl } from "./data/starters.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const clientDist = path.join(rootDir, "..", "client", "dist");
const publicDir = path.join(rootDir, "public");

const app = express();
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.static(publicDir));
app.use(express.static(clientDist));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "poke-quiz-server" });
});

app.get("/api/starters", (_req, res) => {
  res.json({
    starters: STARTERS.map((s) => ({
      ...s,
      imageUrl: getStarterSpriteUrl(s.id),
    })),
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) {
      res
        .status(503)
        .send(
          "Frontend no compilado. Ejecuta <code>npm run build</code> en /client o usa el modo desarrollo."
        );
    }
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  registerSocketHandlers(io, socket);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\n[ERROR] El puerto ${config.port} ya está en uso (otra instancia del servidor o proceso colgado).\n\n` +
        `Opciones:\n` +
        `  1) En PowerShell, libera el puerto:\n` +
        `     Get-NetTCPConnection -LocalPort ${config.port} | Select-Object OwningProcess\n` +
        `     Stop-Process -Id <PID> -Force\n` +
        `  2) O usa otro puerto en server/.env:  PORT=3002\n\n`
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(config.port, config.host, () => {
  console.log(
    `Servidor en http://${config.host}:${config.port} — CLIENT_URL (referencia): ${config.clientUrl}`
  );
});
