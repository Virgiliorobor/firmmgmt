import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";
import { MIGRATIONS } from "./migrations";
import { loadEnv } from "./env";

export type AppDb = PgliteDatabase<typeof schema>;
export type DbWriter = Pick<AppDb, "insert" | "select" | "update" | "delete">;

export type DbHandle = {
  db: AppDb;
  kind: "postgres" | "pglite";
  exec: (sql: string) => Promise<void>;
  close: () => Promise<void>;
  ping: () => Promise<boolean>;
};

export async function openDatabase(options?: {
  databaseUrl?: string;
  pglitePath?: string;
  memory?: boolean;
}): Promise<DbHandle> {
  const env = loadEnv();
  const databaseUrl = options?.memory ? undefined : (options?.databaseUrl ?? env.databaseUrl);

  if (databaseUrl && databaseUrl.startsWith("postgres")) {
    const client = postgres(databaseUrl, { max: 10 });
    const db = drizzlePg(client, { schema }) as unknown as AppDb;
    return {
      db,
      kind: "postgres",
      exec: async (sql) => {
        await client.unsafe(sql);
      },
      close: async () => {
        await client.end({ timeout: 5 });
      },
      ping: async () => {
        await client`select 1`;
        return true;
      },
    };
  }

  const memory = options?.memory === true;
  const dataDir = memory ? undefined : options?.pglitePath ?? env.pglitePath;
  if (dataDir) {
    mkdirSync(path.resolve(dataDir), { recursive: true });
  }
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  await client.waitReady;
  const db = drizzlePglite(client, { schema });
  return {
    db,
    kind: "pglite",
    exec: async (sql) => {
      await client.exec(sql);
    },
    close: async () => {
      await client.close();
    },
    ping: async () => {
      await client.query("select 1");
      return true;
    },
  };
}

export async function applyMigrations(handle: DbHandle): Promise<void> {
  await handle.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL
    );
  `);
  for (const migration of MIGRATIONS) {
    await handle.exec(migration.sql);
    await handle.exec(
      `INSERT INTO schema_migrations (id, applied_at) VALUES ('${migration.id}', NOW()) ON CONFLICT (id) DO NOTHING`,
    );
  }
}

const globalForDb = globalThis as unknown as { lfmDb?: Promise<DbHandle> };

export function getSharedHandle(): Promise<DbHandle> {
  if (!globalForDb.lfmDb) {
    globalForDb.lfmDb = (async () => {
      const handle = await openDatabase();
      await applyMigrations(handle);
      return handle;
    })();
  }
  return globalForDb.lfmDb;
}

export async function resetSharedHandle(): Promise<void> {
  if (globalForDb.lfmDb) {
    const handle = await globalForDb.lfmDb;
    await handle.close();
    globalForDb.lfmDb = undefined;
  }
}
