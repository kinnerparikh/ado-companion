import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root (try .env.local first, then .env)
config({ path: resolve(__dirname, "../../../.env.local") });
config({ path: resolve(__dirname, "../../../.env") });

/**
 * Get ADO credentials from environment variables.
 * Returns null if not configured, so tests can be skipped.
 */
export function getAdoCredentials(): { org: string; pat: string } | null {
  const org = process.env.ADO_ORG;
  const pat = process.env.ADO_PAT;

  if (!org || !pat) {
    return null;
  }

  return { org, pat };
}
