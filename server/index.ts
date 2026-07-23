// Local server entry — replaces 妙搭's @lark-apaas/express-core
import express from "express";
import path from "path";
import { registerRoutes } from "./routes/index";
import { initDbConnection, saveDb } from "./db/index";
import { initDb } from "./db/migrate";

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "localhost";
const basePath = process.env.CLIENT_BASE_PATH || "/";

async function main() {
  // Initialize database connection first (sql.js WASM)
  await initDbConnection();
  // Create tables if needed
  await initDb();

  // Persist initial schema
  saveDb();

  const app = express();

  // Standard middleware
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // CORS for local dev
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // Auto-persist SQLite after write requests (sql.js is in-memory)
  app.use((req, _res, next) => {
    if (["POST", "PUT", "DELETE"].includes(req.method)) {
      _res.on("finish", () => saveDb());
    }
    next();
  });

  // All routes under basePath
  const router = express.Router();
  registerRoutes(router);

  app.use(basePath, router);

  const server = app.listen(port, host, () => {
    console.log(`[daily-review] Server running at http://${host}:${port}${basePath}`);
    console.log(`[daily-review] DB: ${process.env.DB_PATH || "data/app.db"}`);
  });

  // Graceful shutdown — persist DB before exit
  const shutdown = () => {
    console.log("[daily-review] Shutting down, saving database...");
    saveDb();
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[daily-review] Failed to start:", err);
  process.exit(1);
});
