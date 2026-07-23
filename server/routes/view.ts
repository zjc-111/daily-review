// In dev, Vite handles UI; this is mainly for `pnpm start`
// NOTE: this file is compiled to dist/server/server/routes/view.js
// so the path to dist/client requires going up 3 levels.
import path from "path";
import fs from "fs";
import express from "express";
import type { Request, Response, Router } from "express";

const DIST_DIR = path.resolve(__dirname, "../../../client");
const INDEX_HTML = path.join(DIST_DIR, "index.html");

export function registerViewRoute(router: Router) {
  // Serve static files from built client (JS, CSS, images, etc.)
  if (fs.existsSync(DIST_DIR)) {
    router.use(express.static(DIST_DIR));
  }

  // SPA fallback — all unmatched routes return index.html
  router.get("/{*path}", (_req: Request, res: Response) => {
    if (fs.existsSync(INDEX_HTML)) {
      res.type("html").sendFile(INDEX_HTML);
    } else {
      res.type("html").send(`
        <!doctype html>
        <html lang="zh-CN">
          <head>
            <meta charset="UTF-8" />
            <title>Daily Review</title>
          </head>
          <body>
            <h1>Daily Review — API Mode</h1>
            <p>前端未构建。请先运行 <code>pnpm build:client</code>，或在开发模式下访问 <a href="http://localhost:5173">http://localhost:5173</a>。</p>
            <p>API 端点：<a href="/api/auth/me">/api/auth/me</a> 等。</p>
          </body>
        </html>
      `);
    }
  });
}
