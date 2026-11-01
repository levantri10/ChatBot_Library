import { createHash, timingSafeEqual } from "node:crypto";
import { bookText, lexicalScore, normalize } from "./core.js";
export async function db(path, options = {}) {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("DATABASE_UNCONFIGURED");
  const r = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers,
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error(`DATABASE_${r.status}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}
export async function gemini(
  method,
  body,
  model = process.env.GEMINI_MODEL || "gemini-2.5-flash",
) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_UNCONFIGURED");
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(22000),
    },
  );
  if (!r.ok) throw new Error(`GEMINI_${r.status}`);
  return r.json();
}
export async function embed(text, taskType = "RETRIEVAL_QUERY") {
  const result = await gemini(
    "embedContent",
    { content: { parts: [{ text }] }, taskType, outputDimensionality: 768 },
    "gemini-embedding-001",
  );
  const vector = result.embedding.values;
  const norm = Math.hypot(...vector);
  return vector.map((v) => v / norm);
}
export async function catalog() {
  const [books, documents] = await Promise.all([
    db("library_books?select=*&order=title"),
    db("library_documents?select=*&order=kind"),
  ]);
  return { books, documents };
}
export async function indexSource(source, type) {
  const content = type === "book" ? bookText(source) : source.content;
  let embedding = null;
  try {
    embedding = await embed(
      `${source.title}\n${content}`,
      "RETRIEVAL_DOCUMENT",
    );
  } catch {
    /* Lexical retrieval remains available. */
  }
  await db("library_chunks?on_conflict=source_id,source_type", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      source_id: source.id,
      source_type: type,
      title: source.title,
      content,
      embedding,
      updated_at: new Date().toISOString(),
    }),
  });
  return !!embedding;
}
export async function retrieve(question, data) {
  const records = [
    ...data.books.map((b) => ({
      source_id: b.id,
      source_type: "book",
      title: b.title,
      content: bookText(b),
    })),
    ...data.documents.map((d) => ({
      source_id: d.id,
      source_type: d.kind,
      title: d.title,
      content: d.content,
    })),
  ];
  let vectorMatches = [];
  let semantic = false;
  try {
    const embedding = await embed(question);
    vectorMatches = await db("rpc/library_match", {
      method: "POST",
      body: JSON.stringify({ query_embedding: embedding, limit_count: 5 }),
    });
    semantic = vectorMatches.length > 0;
  } catch {
    /* Explicit lexical fallback. */
  }
  const q = normalize(question);
  const ranked = records
    .map((r) => ({
      ...r,
      score:
        lexicalScore(question, `${r.title} ${r.content}`) +
        (q.includes(normalize(r.title)) ? 3 : 0) +
        (vectorMatches.some((v) => v.source_id === r.source_id) ? 0.5 : 0) +
        (r.source_type === "hours" &&
        /gio|mo cua|dong cua|thu bay|chu nhat|hanh chinh/.test(q)
          ? 2
          : 0),
    }))
    .filter((r) => r.score >= 0.2)
    .sort((a, b) => b.score - a.score);
  const best = ranked[0]?.score || 0;
  return {
    sources: ranked
      .filter((r) => r.score >= Math.max(0.2, best * 0.55))
      .slice(0, 5),
    semantic,
  };
}
export async function allow(req, bucket, max, seconds) {
  const ip =
    req.headers["x-vercel-forwarded-for"] ||
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "unknown";
  const key = createHash("sha256")
    .update(
      `${process.env.RATE_LIMIT_SALT || process.env.ADMIN_PASSWORD}:${bucket}:${ip}`,
    )
    .digest("hex");
  return db("rpc/library_allow_request", {
    method: "POST",
    body: JSON.stringify({
      bucket: key,
      max_hits: max,
      window_seconds: seconds,
    }),
  });
}
export function admin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  const supplied = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!expected || !supplied) return false;
  const a = createHash("sha256").update(expected).digest(),
    b = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(a, b);
}
export function init(req, res, methods) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!methods.includes(req.method)) {
    res.setHeader("Allow", methods.join(", "));
    res.status(405).json({ error: "Phương thức không hỗ trợ." });
    return false;
  }
  return true;
}
