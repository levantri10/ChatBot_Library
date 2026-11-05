import { test } from "node:test";
import assert from "node:assert/strict";
import { retrieve } from "../lib/server.js";
import { lexicalScore } from "../lib/core.js";

test("retrieval separates opening hours, policies, book names and unknown titles", async (t) => {
  const original = process.env.EMBEDDING_PROVIDER;
  process.env.EMBEDDING_PROVIDER = "none";
  t.after(() => { if (original === undefined) delete process.env.EMBEDDING_PROVIDER; else process.env.EMBEDDING_PROVIDER = original; });
  const data = {
    books: [{ id: "book", title: "Cơ sở dữ liệu", author: "Tác giả mẫu", summary: "SQL", total: 10, available: 3 }],
    documents: [
      { id: "hours", kind: "hours", title: "Giờ hành chính", content: "Thứ Hai đến Thứ Sáu: 07:30–17:00" },
      { id: "policy", kind: "policy", title: "Quy định mượn sách", content: "Tối đa 3 cuốn trong 14 ngày." },
      { id: "notice", kind: "notice", title: "Giới thiệu dữ liệu demo", content: "Dữ liệu minh họa" },
    ],
  };
  assert.equal((await retrieve("co so du lieu con bao nhieu cuon", data)).sources[0].source_id, "book");
  assert.equal((await retrieve("Giờ mở cửa thư viện?", data)).sources[0].source_type, "hours");
  assert.equal((await retrieve("Quy định mượn sách?", data)).sources[0].source_type, "policy");
  assert.notEqual((await retrieve("Giới thiệu dữ liệu demo", data)).sources[0].source_type, "hours");
  assert.equal((await retrieve("Thư viện có sách Harry Potter không?", data)).sources.length, 0);
  assert.equal(lexicalScore("AI", "available"), 0);
});
