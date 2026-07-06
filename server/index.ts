import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { setupWebSocket } from "./websocket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

app.use(express.json());

const distPath = path.resolve(__dirname, "../dist/public");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

setupWebSocket(server);

// Railway nutzt PORT env variable, fallback 5000 für lokal
const PORT = parseInt(process.env.PORT ?? "5000", 10);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🎯 Quiz App läuft!`);
  console.log(`   Lokal:    http://localhost:${PORT}`);
  console.log(`   Online:   https://quiznight-production-3277.up.railway.app\n`);
});
