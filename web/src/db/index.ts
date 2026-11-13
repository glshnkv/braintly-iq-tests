import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // `prepare: false` keeps us compatible with PgBouncer / Neon pooled connections.
  const client = postgres(url, { prepare: false, max: process.env.NODE_ENV === "production" ? 5 : 10 });
  return drizzle(client, { schema });
}

type Db = ReturnType<typeof createClient>;

// Reuse one client across hot reloads in dev and across invocations in a warm serverless instance.
const globalForDb = globalThis as unknown as { __db?: Db };

export function getDb(): Db {
  if (!globalForDb.__db) globalForDb.__db = createClient();
  return globalForDb.__db;
}

export { schema };
