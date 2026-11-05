import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

test("project env files override inherited client credentials without changing unrelated environment", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "library-env-test-"));
  t.after(() => {
    fs.unlinkSync(path.join(directory, ".env"));
    fs.unlinkSync(path.join(directory, ".env.local"));
    fs.rmdirSync(directory);
  });
  fs.writeFileSync(path.join(directory, ".env"), "LIBRARY_SHOPAI_API_KEY=project-test-key\nSHOPAI_MODEL=nemotron-super\nPATH=untrusted-value\n");
  fs.writeFileSync(path.join(directory, ".env.local"), "LIBRARY_SHOPAI_API_KEY=local-test-key\n");
  const loader = new URL("../scripts/load-env.mjs", import.meta.url).href;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `import ${JSON.stringify(loader)}; console.log(JSON.stringify({ key:process.env.LIBRARY_SHOPAI_API_KEY, model:process.env.SHOPAI_MODEL, path:process.env.PATH }));`], {
    cwd: directory, encoding: "utf8", env: { ...process.env, LIBRARY_SHOPAI_API_KEY: "inherited-test-key", SHOPAI_MODEL: "other-client-model" },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { key: "local-test-key", model: "nemotron-super", path: process.env.PATH });
});
