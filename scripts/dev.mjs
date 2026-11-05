import "./load-env.mjs";
import http from "node:http";
import { createServer } from "vite";
import chat from "../api/chat.js";
import catalog from "../api/catalog.js";
import admin from "../api/admin.js";

const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
const handlers = { "/api/chat": chat, "/api/catalog": catalog, "/api/admin": admin };
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;
  if (!path.startsWith("/api/")) return vite.middlewares(req, res);
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(data)); };
  const handler = handlers[path];
  if (!handler) return res.status(404).json({ error: "Không tìm thấy API." });
  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 65536) return res.status(413).json({ error: "Dữ liệu quá lớn." });
    }
    if (body) {
      try { req.body = JSON.parse(body); }
      catch { return res.status(400).json({ error: "Dữ liệu JSON không hợp lệ." }); }
    }
    await handler(req, res);
  } catch {
    if (!res.writableEnded) res.status(500).json({ error: "Không xử lý được yêu cầu." });
  }
});
const port = Number(process.env.PORT || 3000);
server.listen(port, "127.0.0.1", () => console.log(`Thư Viện AI: http://127.0.0.1:${port}`));
async function close() { server.close(); await vite.close(); process.exit(0); }
process.on("SIGINT", close);
process.on("SIGTERM", close);
