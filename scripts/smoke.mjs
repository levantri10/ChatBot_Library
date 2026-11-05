// Run manually: node --env-file=.env scripts/smoke.mjs
import "./load-env.mjs";
import assert from "node:assert/strict";
import handler from "../api/chat.js";
import adminHandler from "../api/admin.js";
import { db } from "../lib/server.js";
async function invoke(fn, req) {
  if (process.env.BASE_URL) {
    const path = fn === handler ? "chat" : "admin";
    const response = await fetch(`${process.env.BASE_URL}/api/${path}`, {
      method: req.method,
      headers: { "Content-Type": "application/json", ...req.headers },
      ...(req.body ? { body: JSON.stringify(req.body) } : {}),
    });
    return { status: response.status, data: await response.json() };
  }
  const result = { status: 200 };
  const res = {
    setHeader() {},
    status(status) {
      result.status = status;
      return this;
    },
    json(data) {
      result.data = data;
    },
  };
  await fn(
    { headers: {}, socket: { remoteAddress: "local-smoke-test" }, ...req },
    res,
  );
  return result;
}
const stock = await invoke(handler, {
  method: "POST",
  body: { message: "Sách Cơ sở dữ liệu còn bao nhiêu cuốn?" },
});
assert.equal(stock.status, 200);
if (process.env.REQUIRE_AI === "1") assert.equal(stock.data.mode, process.env.CHAT_PROVIDER);
assert.equal(stock.data.sources[0].title, "Cơ sở dữ liệu");
assert.match(stock.data.sources[0].content, /còn: 3 cuốn/);
const hours = await invoke(handler, {
  method: "POST",
  body: { message: "Giờ hành chính thư viện là khi nào?" },
});
assert.equal(hours.status, 200);
assert.equal(hours.data.sources[0].source_type, "hours");
const unknown = await invoke(handler, {
  method: "POST",
  body: { message: "Thư viện có sách Harry Potter không?" },
});
assert.equal(unknown.status, 200);
assert.equal(unknown.data.sources.length, 0);
assert.equal((await invoke(adminHandler, { method: "GET" })).status, 401);
assert.equal(
  (
    await invoke(adminHandler, {
      method: "GET",
      headers: { authorization: `Bearer ${process.env.ADMIN_PASSWORD}` },
    })
  ).status,
  200,
);
assert.equal(
  (
    await invoke(adminHandler, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.ADMIN_PASSWORD}` },
      body: {
        type: "book",
        data: {
          title: "x",
          author: "",
          category: "",
          summary: "",
          location: "",
          total: 1,
          available: 2,
        },
      },
    })
  ).status,
  400,
);
const chunks = await db("library_chunks?select=id,embedding");
console.log(
  `PASS: stock, hours, unknown book, admin auth, inventory validation; ${chunks.length} indexed sources. Chat mode: ${stock.data.mode}.`,
);
