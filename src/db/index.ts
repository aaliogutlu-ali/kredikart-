import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const g = globalThis as unknown as { __db?: Db };

/** Uygulamanın veritabanı bağlantısı (DATABASE_URL). */
export function db(): Db {
  if (!g.__db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL tanımlı değil");
    const client = postgres(url, { max: 5, prepare: false });
    g.__db = drizzle(client, { schema }) as unknown as Db;
  }
  return g.__db;
}

export { schema };
