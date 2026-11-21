import crypto from "node:crypto";

/**
 * Prints a new random API key for POST /api/ingest.
 *   npm run ingest:key
 * Put it in the INGEST_API_KEY environment variable (Vercel > Settings > Environment Variables)
 * and give the SAME value to whoever pushes the data. Never commit it to git.
 */
const key = `ohtms_live_${crypto.randomBytes(32).toString("hex")}`;
console.log(key);
