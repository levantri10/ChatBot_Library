import { test } from "node:test";
import assert from "node:assert/strict";
import { shopaiAnswer } from "../lib/chat-model.js";
import handler from "../api/chat.js";

test("SHOP AI PRO uses Chat Completions auth and returns only assistant output", async (t) => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.LIBRARY_SHOPAI_API_KEY = "test-key";
  process.env.SHOPAI_MODEL = "nemotron-super";
  process.env.SHOPAI_BASE_URL = "https://shopaipro.tech/v1/";
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(String(url), "https://shopaipro.tech/v1/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer test-key");
    assert.equal(options.redirect, "error");
    const body = JSON.parse(options.body);
    assert.equal(body.model, "nemotron-super");
    assert.deepEqual(body.messages, [{ role: "system", content: "Use sources only" }, { role: "user", content: "Question and context" }]);
    assert.equal(body.max_tokens, 1200);
    return Response.json({ choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Còn 3 cuốn [1].", reasoning_content: "private reasoning" } }] });
  });
  assert.equal(await shopaiAnswer("Use sources only", "Question and context"), "Còn 3 cuốn [1].");
});

test("SHOP AI PRO rejects invalid credentials, empty and incomplete answers", async (t) => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.LIBRARY_SHOPAI_API_KEY = "test-key";
  process.env.SHOPAI_MODEL = "nemotron-super";
  let result = new Response("secret upstream detail", { status: 401 });
  t.mock.method(globalThis, "fetch", async () => result);
  await assert.rejects(shopaiAnswer("", ""), { message: "SHOPAI_401" });
  result = Response.json({ choices: [] });
  await assert.rejects(shopaiAnswer("", ""), { message: "EMPTY_RESPONSE" });
  result = Response.json({ choices: [{ finish_reason: "length", message: { role: "assistant", content: "partial" } }] });
  await assert.rejects(shopaiAnswer("", ""), { message: "SHOPAI_INCOMPLETE_RESPONSE" });
});

test("chat returns sourced SHOP AI PRO output and falls back after provider failure", async (t) => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  Object.assign(process.env, {
    CHAT_PROVIDER: "shopaipro", LIBRARY_SHOPAI_API_KEY: "test-key", SHOPAI_MODEL: "test-model",
    SUPABASE_URL: "https://database.test", SUPABASE_SERVICE_ROLE_KEY: "test-db-key",
    GEMINI_API_KEY: "",
  });
  let fail = false;
  t.mock.method(globalThis, "fetch", async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith("library_allow_request")) return Response.json(true);
    if (path.endsWith("library_books")) return Response.json([
      { id: "test-book", title: "Sách kiểm thử", total: 5, available: 3, summary: "Dữ liệu mô phỏng" },
    ]);
    if (path.endsWith("library_documents")) return Response.json([]);
    assert.equal(path, "/v1/chat/completions");
    return fail ? new Response("", { status: 401 }) : Response.json({ choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Còn 3 cuốn [1]." } }] });
  });
  async function ask() {
    let output;
    await handler({ method: "POST", headers: {}, body: { message: "Sách kiểm thử còn bao nhiêu?" } }, {
      setHeader() {}, status(code) { assert.fail(`Unexpected status ${code}`); }, json(value) { output = value; },
    });
    return output;
  }
  const success = await ask();
  assert.equal(success.mode, "shopaipro");
  assert.equal(success.answer, "Còn 3 cuốn [1].");
  assert.equal(success.sources[0].source_id, "test-book");
  fail = true;
  const fallback = await ask();
  assert.equal(fallback.mode, "retrieval");
  assert.match(fallback.answer, /còn: 3 cuốn/);
  assert.doesNotMatch(fallback.answer, /test-key|401/);
});
