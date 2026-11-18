import { runMigrations } from "../src/server/migrations/runner";

async function main() {
  console.log("Applying database migrations...");
  const applied = await runMigrations();
  if (applied.length === 0) {
    console.log("Database schema is up to date (0 pending migrations).");
  } else {
    console.log(`Applied ${applied.length} migration(s):`, applied.join(", "));
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
