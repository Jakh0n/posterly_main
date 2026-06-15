// Applies a SQL migration file to the Supabase Postgres database over a direct
// connection. Requires a connection string in SUPABASE_DB_URL.
//
// Usage:
//   SUPABASE_DB_URL="postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres" \
//     node scripts/apply-migration.mjs ../supabase/migrations/20260614020000_generation.sql
import { readFileSync } from "node:fs";
import { Client } from "pg";

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL");
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/apply-migration.mjs <path-to-sql>");
  process.exit(1);
}

const sql = readFileSync(new URL(file, import.meta.url), "utf8");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("MIGRATION_APPLIED", file);
} catch (err) {
  console.error("MIGRATION_FAILED", err.message);
  process.exit(1);
} finally {
  await client.end();
}
