/**
 * API CONTRACTS — the single source of truth between frontend and backend.
 * RULE: change a contract in its own PR first; both owners approve; then implement/consume it.
 * Existing endpoints' response types live in src/lib/types.ts (derived from server services).
 */
export * from "./common";
export * from "./alerts";
export * from "./users";
export * from "./audit";
export * from "./analytics";
export * from "./settings";
export * from "./system";
export * from "./tanks";
