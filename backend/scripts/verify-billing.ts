/**
 * Verifies the P1 billing pipeline without real Polar credentials:
 *  A) Webhook crediting + idempotency + subscription plan changes (direct).
 *  B) HTTP signature + raw-body wiring (correctly signed => not 403, tampered => 403).
 *
 * All mutations are reverted at the end so the dev database is left unchanged.
 * Run: npx tsx scripts/verify-billing.ts
 */
import { createServer } from "node:http";
import { Webhook } from "standardwebhooks";

import { createApp } from "../src/app";
import { env } from "../src/lib/env";
import { createServerClient } from "../src/lib/supabase";
import { handlePolarEvent } from "../src/services/billing/webhook";

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    throw new Error(`ASSERT FAILED: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function getBalance(userId: string): Promise<number> {
  const supabase = createServerClient();
  const { data } = await supabase.rpc("get_credit_balance", {
    p_user_id: userId,
  });
  return typeof data === "number" ? data : 0;
}

async function getPlan(userId: string): Promise<string> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  return (data?.plan as string) ?? "free";
}

async function main(): Promise<void> {
  const supabase = createServerClient();

  const { data: list, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (error || !list.users.length) {
    throw new Error("No users found to test against");
  }
  const userId = list.users[0].id;
  console.log(`Testing against user ${list.users[0].email} (${userId})\n`);

  const originalPlan = await getPlan(userId);
  const balance0 = await getBalance(userId);
  const credits = 7;
  const orderId = `test_order_${Date.now()}`;

  // --- A) Crediting + idempotency -----------------------------------------
  console.log("A) order.paid crediting + idempotency");
  await handlePolarEvent({
    type: "order.paid",
    data: { id: orderId, metadata: { userId, credits } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  const balance1 = await getBalance(userId);
  assert(balance1 === balance0 + credits, `balance += ${credits} on first delivery`);

  await handlePolarEvent({
    type: "order.paid",
    data: { id: orderId, metadata: { userId, credits } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  const balance2 = await getBalance(userId);
  assert(balance2 === balance1, "duplicate delivery is idempotent (no double credit)");

  // --- A2) Subscription plan changes --------------------------------------
  console.log("\nA2) subscription plan changes");
  const subId = `test_sub_${Date.now()}`;
  await handlePolarEvent({
    type: "subscription.active",
    data: { id: subId, status: "active", metadata: { userId } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  assert((await getPlan(userId)) === "pro", "subscription.active sets plan = pro");

  await handlePolarEvent({
    type: "subscription.revoked",
    data: { id: subId, status: "canceled", metadata: { userId } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  assert((await getPlan(userId)) === "free", "subscription.revoked sets plan = free");

  // --- B) HTTP signature + raw-body wiring ---------------------------------
  console.log("\nB) HTTP signature + raw-body wiring");
  const app = createApp();
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const url = `http://127.0.0.1:${port}/api/v1/webhooks/polar`;

  const payload = JSON.stringify({
    type: "order.paid",
    timestamp: new Date().toISOString(),
    data: { id: "wh_test", metadata: { userId, credits: 1 } },
  });
  const webhookId = "msg_test";
  const timestamp = new Date();
  const base64Secret = Buffer.from(env.POLAR_WEBHOOK_SECRET, "utf-8").toString(
    "base64",
  );
  const signature = new Webhook(base64Secret).sign(webhookId, timestamp, payload);

  const baseHeaders = {
    "content-type": "application/json",
    "webhook-id": webhookId,
    "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
  };

  const goodRes = await fetch(url, {
    method: "POST",
    headers: { ...baseHeaders, "webhook-signature": signature },
    body: payload,
  });
  assert(
    goodRes.status !== 403,
    `valid signature passes verification (status ${goodRes.status}, not 403)`,
  );

  const badRes = await fetch(url, {
    method: "POST",
    headers: { ...baseHeaders, "webhook-signature": "v1,deadbeef" },
    body: payload,
  });
  assert(badRes.status === 403, "tampered signature is rejected (403)");

  await new Promise<void>((resolve) => server.close(() => resolve()));

  // --- Cleanup: restore balance + plan + remove test subscription ----------
  console.log("\nCleanup");
  await supabase.from("credit_transactions").insert({
    user_id: userId,
    delta: -credits,
    reason: "admin_grant",
    ref_id: `${orderId}_reversal`,
  });
  await supabase.from("profiles").update({ plan: originalPlan }).eq("id", userId);
  await supabase.from("subscriptions").delete().eq("polar_subscription_id", subId);

  const balanceFinal = await getBalance(userId);
  assert(balanceFinal === balance0, "balance restored to original");
  assert((await getPlan(userId)) === originalPlan, "plan restored to original");

  console.log("\nAll billing checks passed.");
}

main().catch((err) => {
  console.error("\nVERIFY FAILED:", err);
  process.exit(1);
});
