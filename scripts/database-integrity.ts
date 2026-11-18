import { q } from "../src/server/db";

export async function getDatabaseIntegrity(): Promise<string> {
  try {
    await q("SELECT 1");
    return "ok";
  } catch (err) {
    throw new Error(`Database integrity check failed: ${String(err)}`);
  }
}
