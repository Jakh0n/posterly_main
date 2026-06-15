import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
const env = {};
for (const l of raw.split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
const rows = [];
for (const u of data.users) {
  const { data: bal } = await admin.rpc("get_credit_balance", {
    p_user_id: u.id,
  });
  rows.push({
    id: u.id,
    email: u.email,
    created: u.created_at,
    last_sign_in: u.last_sign_in_at,
    balance: bal,
  });
}
rows.sort((a, b) =>
  String(b.last_sign_in ?? b.created).localeCompare(
    String(a.last_sign_in ?? a.created),
  ),
);
for (const r of rows) {
  console.log(
    `${r.balance ?? "?"}\t${r.email}\t${r.id}\tlast_sign_in=${r.last_sign_in ?? "-"}`,
  );
}
