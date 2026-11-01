import { test } from "node:test";
import assert from "node:assert/strict";
import { lexicalScore, validateBook, bookText } from "../lib/core.js";
test("Vietnamese retrieval works without accents", () => {
  assert.ok(lexicalScore("co so du lieu", "Cơ sở dữ liệu") >= 0.9);
  assert.equal(lexicalScore("bóng đá", "Cơ sở dữ liệu"), 0);
});
test("inventory cannot exceed total or be negative", () => {
  const b = {
    title: "A",
    author: "",
    category: "",
    location: "",
    summary: "",
    total: 3,
    available: 4,
  };
  assert.throws(() => validateBook(b));
  assert.throws(() => validateBook({ ...b, available: -1 }));
  assert.equal(validateBook({ ...b, available: 0 }).available, 0);
});
test("retrieved stock uses current data", () => {
  assert.match(
    bookText({ title: "A", total: 5, available: 2 }),
    /còn: 2 cuốn; đang mượn: 3/,
  );
});
