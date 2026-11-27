// Veritabanı tablolarını oluşturur / günceller. DATABASE_URL gerekir.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("DATABASE_URL yok, veritabanı güncellemesi atlandı.");
  process.exit(0);
}
const client = postgres(url, { max: 1 });
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
await client.end();
console.log("Veritabanı güncel.");
