import "./load-env.mjs";
import { catalog, indexSource } from "../lib/server.js";
const { books, documents } = await catalog();
let embedded = 0;
for (const [records, type] of [
  [books, "book"],
  [documents, "document"],
]) {
  for (const record of records) {
    const ok = await indexSource(record, type);
    if (ok) embedded++;
    console.log(`${ok ? "vector" : "lexical"}: ${record.title}`);
  }
}
console.log(
  `Đã lập chỉ mục ${books.length + documents.length} nguồn; ${embedded} nguồn có embedding.`,
);
