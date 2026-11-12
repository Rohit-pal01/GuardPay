import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const databaseUrl = process.env.DATABASE_URL?.trim();

/** Tests use deterministic in-memory stores; app runs use Neon when configured. */
export const isDatabaseEnabled = Boolean(databaseUrl) && process.env.NODE_ENV !== 'test';

export const db = isDatabaseEnabled
  ? drizzle({ client: neon(databaseUrl!) })
  : null;

export interface DbClientConfig {
  databaseUrl?: string;
  isConfigured: boolean;
}

export function getDbConfig(): DbClientConfig {
  return {
    databaseUrl,
    isConfigured: isDatabaseEnabled,
  };
}
