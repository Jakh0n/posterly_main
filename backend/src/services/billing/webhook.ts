import type { validateEvent } from "@polar-sh/sdk/webhooks";

import { logger } from "../../utils/logger";
import {
  grantPurchasedCredits,
  setUserPlan,
  upsertSubscription,
} from "./account";

export type PolarEvent = ReturnType<typeof validateEvent>;

/**
 * Minimal, version-tolerant view of the fields we read off Polar order and
 * subscription payloads. We read metadata/customer defensively so SDK shape
 * changes don't break crediting.
 */
interface PolarPayload {
  id?: string;
  status?: string;
  currentPeriodEnd?: string | Date | null;
  metadata?: Record<string, unknown> | null;
  customer?: { externalId?: string | null } | null;
}

function asPayload(data: unknown): PolarPayload {
  return (data ?? {}) as PolarPayload;
}

function metaString(
  payload: PolarPayload,
  key: string,
): string | undefined {
  const value = payload.metadata?.[key];
  return value === undefined || value === null ? undefined : String(value);
}

/** Resolves the owning user id from metadata, falling back to external customer id. */
function resolveUserId(payload: PolarPayload): string | undefined {
  return metaString(payload, "userId") ?? payload.customer?.externalId ?? undefined;
}

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Processes a verified Polar webhook event:
 * - order.paid           → grant purchased credits (idempotent by order id)
 * - subscription.active  → mark plan 'pro' + upsert subscription
 * - subscription.canceled/revoked → mark plan 'free' + update subscription
 * Unhandled event types are logged and ignored.
 */
export async function handlePolarEvent(event: PolarEvent): Promise<void> {
  const payload = asPayload((event as { data?: unknown }).data);

  switch (event.type) {
    case "order.paid": {
      const userId = resolveUserId(payload);
      const credits = Number(metaString(payload, "credits") ?? 0);
      const orderId = payload.id;

      if (!userId || !orderId || !Number.isFinite(credits) || credits <= 0) {
        logger.warn("order.paid missing userId/credits/order id; ignoring", {
          orderId,
          hasUser: Boolean(userId),
          credits,
        });
        return;
      }

      await grantPurchasedCredits(userId, credits, orderId);
      return;
    }

    case "subscription.active":
    case "subscription.created":
    case "subscription.updated": {
      const userId = resolveUserId(payload);
      if (!userId || !payload.id) {
        logger.warn("subscription event missing userId/id; ignoring", {
          type: event.type,
        });
        return;
      }

      await upsertSubscription({
        userId,
        polarSubscriptionId: payload.id,
        status: payload.status ?? "active",
        currentPeriodEnd: toIso(payload.currentPeriodEnd),
      });

      if ((payload.status ?? "active") === "active") {
        await setUserPlan(userId, "pro");
      }
      return;
    }

    case "subscription.canceled":
    case "subscription.revoked": {
      const userId = resolveUserId(payload);
      if (!userId) {
        logger.warn("subscription cancel missing userId; ignoring", {
          type: event.type,
        });
        return;
      }

      if (payload.id) {
        await upsertSubscription({
          userId,
          polarSubscriptionId: payload.id,
          status: payload.status ?? "canceled",
          currentPeriodEnd: toIso(payload.currentPeriodEnd),
        });
      }
      await setUserPlan(userId, "free");
      return;
    }

    default:
      logger.info("Ignoring Polar event", { type: event.type });
  }
}
