import { readFileSync } from "node:fs";
import pg from "pg";

const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
const env = {};
for (const l of raw.split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const ref = env.SUPABASE_URL.match(/https:\/\/([^.]+)\./)[1];
const key = env.SUPABASE_SERVICE_ROLE_KEY;

const hosts = [
  { host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" },
  { host: `aws-0-us-east-1.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
  { host: `aws-0-us-east-2.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
];

for (const h of hosts) {
  const c = new pg.Client({
    host: h.host,
    port: h.port,
    user: h.user,
    password: key,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await c.connect();
    const r = await c.query("select 1 as ok");
    console.log("CONNECTED", h.host, JSON.stringify(r.rows));
    await c.end();
  } catch (e) {
    console.log("FAIL", h.host, e.code || e.message);
  }
}
