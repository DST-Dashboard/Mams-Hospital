import fs from "node:fs";

if (typeof process.loadEnvFile === "function" && fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}

import bcrypt from "bcryptjs";
import { q, q1, closePool } from "../src/server/db";
import { env } from "../src/server/env";

async function main() {
  const e = env();
  const hash = await bcrypt.hash(e.ADMIN_PASSWORD, 10);
  const now = Date.now();

  const existing = await q1<{ id: number }>(
    "SELECT id FROM users WHERE lower(email) = lower($1)",
    [e.ADMIN_EMAIL]
  );

  if (existing) {
    await q(
      "UPDATE users SET password_hash = $1, role = 'admin', disabled = FALSE, must_change_password = FALSE WHERE id = $2",
      [hash, existing.id]
    );
  } else {
    await q(
      `INSERT INTO users (email, name, password_hash, role, disabled, must_change_password, created_at)
       VALUES ($1, 'Administrator', $2, 'admin', FALSE, FALSE, $3)`,
      [e.ADMIN_EMAIL, hash, now]
    );
  }

  console.log(`Admin ready -> email: ${e.ADMIN_EMAIL} (password = ADMIN_PASSWORD from .env)`);
}

main()
  .then(async () => {
    await closePool();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Failed to reset admin:", err);
    await closePool();
    process.exit(1);
  });
