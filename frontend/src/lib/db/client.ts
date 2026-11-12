/**
 * Database client with fallback support (FR-A2-4 & FR-A2-5).
 * When DATABASE_URL is provided, connects to Neon Postgres.
 * Otherwise, falls back to the in-memory repository store.
 */

export interface DbClientConfig {
  databaseUrl?: string;
  isConfigured: boolean;
}

export function getDbConfig(): DbClientConfig {
  const databaseUrl = process.env.DATABASE_URL;
  return {
    databaseUrl,
    isConfigured: Boolean(databaseUrl && databaseUrl.trim().length > 0),
  };
}
