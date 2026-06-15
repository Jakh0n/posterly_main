// End-to-end verification of the generation pipeline against the live stack.
//
// Prereqs:
//   - backend running on http://localhost:4000  (npm run dev)
//   - generation.sql migration applied (error column, refund_credits, realtime)
//
// Verifies:
//   1. A campaign goes queued -> done with exactly 3 creatives (final_url set).
//   2. The credit ledger is debited exactly once for that campaign.
//   3. A failing campaign ends 'failed' with a recorded error AND is refunded.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const API = process.env.API_URL ?? "http://localhost:4000";
const WORKER_SECRET = "local-dev-worker-secret";

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
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function balance(userId) {
  const { data, error } = await admin.rpc("get_credit_balance", {
    p_user_id: userId,
  });
  if (error) throw new Error(`balance: ${error.message}`);
  return data;
}

async function ledger(userId) {
  const { data } = await admin
    .from("credit_transactions")
    .select("delta, reason, ref_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

// A clean, unambiguous product photo (a sneaker) so GPT-4o art-directs it
// instead of refusing — random stock photos often trip the safety filter.
const SAMPLE_PRODUCT_URL =
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80";

async function uploadPhoto() {
  const src = await fetch(SAMPLE_PRODUCT_URL);
  if (!src.ok) {
    throw new Error(`sample image fetch failed: ${src.status}`);
  }
  const png = await sharp(Buffer.from(await src.arrayBuffer()))
    .resize(800, 800, { fit: "cover" })
    .png()
    .toBuffer();

  const form = new FormData();
  form.append("photo", new Blob([png], { type: "image/png" }), "product.png");

  const res = await fetch(`${API}/api/v1/campaigns/upload`, {
    method: "POST",
    body: form,
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`upload failed: ${JSON.stringify(body)}`);
  }
  return body.data.url;
}

async function enqueue(campaignId) {
  const res = await fetch(`${API}/api/v1/jobs/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-worker-secret": WORKER_SECRET,
    },
    body: JSON.stringify({ campaignId }),
  });
  if (res.status !== 202) {
    throw new Error(`enqueue failed: ${res.status} ${await res.text()}`);
  }
}

async function waitForTerminal(campaignId, timeoutMs = 120_000) {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    const { data } = await admin
      .from("campaigns")
      .select("status, error")
      .eq("id", campaignId)
      .single();
    if (data.status !== last) {
      log(`   status -> ${data.status}`);
      last = data.status;
    }
    if (data.status === "done" || data.status === "failed") return data;
    await sleep(1500);
  }
  throw new Error("timed out waiting for terminal status");
}

async function createCampaign(userId, productImageUrl, name) {
  const { data, error } = await admin
    .from("campaigns")
    .insert({
      user_id: userId,
      product_name: name,
      price: "$49",
      promo: "20% OFF",
      product_image_url: productImageUrl,
      status: "queued",
    })
    .select("id")
    .single();
  if (error) throw new Error(`create campaign: ${error.message}`);

  const { error: spendError } = await admin.rpc("spend_credits", {
    p_user_id: userId,
    p_amount: 1,
    p_reason: "campaign",
    p_ref_id: data.id,
  });
  if (spendError) throw new Error(`spend: ${spendError.message}`);

  return data.id;
}

function assert(cond, msg) {
  if (!cond) {
    log("   ✗ FAIL:", msg);
    process.exitCode = 1;
  } else {
    log("   ✓", msg);
  }
}

async function main() {
  const email = `posterly.pipeline.${Date.now()}@gmail.com`;
  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email,
      password: "Test12345!",
      email_confirm: true,
    },
  );
  if (createErr) throw new Error(`create user: ${createErr.message}`);
  const userId = created.user.id;
  log("USER", userId);

  await sleep(1000); // allow handle_new_user trigger to land the signup bonus
  const startBalance = await balance(userId);
  log("START_BALANCE", startBalance);
  assert(startBalance === 5, "new user starts with 5 credits");

  // ---- Happy path ----
  log("\n[1] Happy path: queued -> done with 3 variants");
  const okUrl = await uploadPhoto();
  const okId = await createCampaign(userId, okUrl, "Aurora Sneakers");
  log("   campaign", okId, "| balance after spend:", await balance(userId));
  await enqueue(okId);
  const okResult = await waitForTerminal(okId);
  assert(okResult.status === "done", "campaign reached 'done'");

  const { data: creatives } = await admin
    .from("creatives")
    .select("variant_index, final_url, background_url, layout")
    .eq("campaign_id", okId)
    .order("variant_index", { ascending: true });
  assert(
    creatives.length === 3,
    `exactly 3 creatives (got ${creatives.length})`,
  );
  assert(
    creatives.every((c) => c.final_url),
    "every creative has a final_url",
  );
  assert(
    creatives.every((c) => c.background_url),
    "every creative has a background_url",
  );
  assert(
    new Set(creatives.map((c) => c.layout?.template)).size === 3,
    "3 distinct templates (studio/lifestyle/flat-lay)",
  );

  const balAfterOk = await balance(userId);
  assert(balAfterOk === 4, `balance debited exactly once (5 -> ${balAfterOk})`);
  const okDebits = (await ledger(userId)).filter(
    (t) => t.ref_id === okId && t.reason === "campaign",
  );
  assert(
    okDebits.length === 1,
    `exactly one 'campaign' debit (got ${okDebits.length})`,
  );

  // ---- Failure path (refund) ----
  log("\n[2] Failure path: failed -> recorded error + refund");
  const failId = await createCampaign(
    userId,
    "https://invalid.invalid/missing.png",
    "Broken Product",
  );
  log("   campaign", failId, "| balance after spend:", await balance(userId));
  await enqueue(failId);
  const failResult = await waitForTerminal(failId);
  assert(failResult.status === "failed", "campaign reached 'failed'");
  assert(Boolean(failResult.error), `error recorded: ${failResult.error}`);

  await sleep(1000);
  const finalBalance = await balance(userId);
  assert(
    finalBalance === 4,
    `credit refunded on failure (back to ${finalBalance})`,
  );
  const failLedger = (await ledger(userId)).filter((t) => t.ref_id === failId);
  const debits = failLedger.filter((t) => t.reason === "campaign");
  const refunds = failLedger.filter((t) => t.reason === "refund");
  assert(debits.length === 1, "failed campaign debited exactly once");
  assert(refunds.length === 1, "failed campaign refunded exactly once");

  log("\nLEDGER", JSON.stringify(await ledger(userId)));
  log(process.exitCode ? "\nRESULT: FAIL" : "\nRESULT: PASS");
}

main().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
