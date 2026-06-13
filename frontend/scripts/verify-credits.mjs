import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

async function main() {
  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(url, anon);

  const email = `posterly.qa.${Date.now()}@gmail.com`;
  const password = "Test12345!";

  const { data: signUp, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (signUpError) {
    console.log("SIGNUP_ERROR", signUpError.message);
    return;
  }

  console.log("SIGNED_UP", email, "session:", Boolean(signUp.session));
  const userId = signUp.user?.id;
  console.log("USER_ID", userId);

  if (!signUp.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      console.log("NO_SESSION_CANNOT_READ", signInError.message);
      return;
    }
  }

  const { data: balance, error: rpcError } = await supabase.rpc(
    "get_credit_balance",
    { p_user_id: userId },
  );
  if (rpcError) {
    console.log("RPC_ERROR", rpcError.message);
    return;
  }
  console.log("CREDIT_BALANCE", balance);
}

main().catch((e) => console.log("FATAL", e.message));
