// Grants credits to a user by appending to the ledger (service role bypasses
// RLS; the append-only trigger permits INSERT). Usage:
//   node scripts/grant-credits.mjs <userId> <amount>
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

const userId = process.argv[2];
const amount = Number(process.argv[3] ?? 20);
if (!userId) {
  console.error("Usage: node scripts/grant-credits.mjs <userId> <amount>");
  process.exit(1);
}

const { error } = await admin.from("credit_transactions").insert({
  user_id: userId,
  delta: amount,
  reason: "admin_grant",
});
if (error) {
  console.error("GRANT_FAILED", error.message);
  process.exit(1);
}

const { data: balance } = await admin.rpc("get_credit_balance", {
  p_user_id: userId,
});
console.log("GRANTED", amount, "NEW_BALANCE", balance);
