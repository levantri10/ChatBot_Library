import fs from "node:fs";
import { parseEnv } from "node:util";

// Project values take precedence over credentials inherited from other clients.
for (const file of [".env", ".env.local"]) {
  if (!fs.existsSync(file)) continue;
  const values = parseEnv(fs.readFileSync(file, "utf8"));
  for (const [key, value] of Object.entries(values)) {
    if (/^(SUPABASE_|GEMINI_|SHOPAI_|LIBRARY_SHOPAI_|CHAT_PROVIDER$|EMBEDDING_PROVIDER$|ADMIN_PASSWORD$|RATE_LIMIT_SALT$)/.test(key))
      process.env[key] = value;
  }
}
