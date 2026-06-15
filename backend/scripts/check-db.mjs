import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnv() {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = readEnv();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1. error column on campaigns
const { error: colErr } = await supabase
  .from("campaigns")
  .select("id, error")
  .limit(1);
console.log(
  "CAMPAIGNS_ERROR_COLUMN:",
  colErr ? `MISSING (${colErr.message})` : "OK",
);

// 2. refund_credits function existence
const { error: rpcErr } = await supabase.rpc("refund_credits", {
  p_user_id: "00000000-0000-0000-0000-000000000000",
  p_ref_id: "00000000-0000-0000-0000-000000000000",
});
if (!rpcErr) {
  console.log("REFUND_CREDITS_FN: OK (unexpected success)");
} else if (/could not find|does not exist|schema cache/i.test(rpcErr.message)) {
  console.log("REFUND_CREDITS_FN: MISSING (" + rpcErr.message + ")");
} else {
  console.log("REFUND_CREDITS_FN: OK (guarded: " + rpcErr.message + ")");
}

// 3. spend_credits + get_credit_balance (baseline, should exist)
const { error: balErr } = await supabase.rpc("get_credit_balance", {
  p_user_id: "00000000-0000-0000-0000-000000000000",
});
console.log(
  "GET_CREDIT_BALANCE_FN:",
  balErr ? `MISSING (${balErr.message})` : "OK",
);
