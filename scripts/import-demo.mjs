import "./load-env.mjs";
import fs from "node:fs";
import { db, indexSource } from "../lib/server.js";
import { validateBook } from "../lib/core.js";

const books = JSON.parse(fs.readFileSync(new URL("../data/public-domain-books.json", import.meta.url), "utf8"));
const existing = await db("library_books?select=id,title");
for (const item of books) {
  if (existing.some((book) => book.title === item.title)) {
    console.log(`Đã có, giữ nguyên: ${item.title}`);
    continue;
  }
  const [saved] = await db("library_books", { method: "POST", body: JSON.stringify(validateBook(item)) });
  await indexSource(saved, "book");
  console.log(`Đã thêm sách minh họa: ${item.title}`);
}
