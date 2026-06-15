import { env } from "../../lib/env";
import { HttpError } from "../../lib/httpError";
import { getPolar, isPolarConfigured } from "../../lib/polar";
import { getPack } from "./catalog";

export interface CreateCheckoutInput {
  userId: string;
  packId: string;
}

export interface CheckoutResult {
  url: string;
}

/**
 * Creates a Polar checkout session for a billing pack. The owning user id and
 * the credits to grant are embedded in checkout metadata so the webhook can
 * fulfil the purchase without trusting the client. Throws a clear 503 when
 * billing is not yet configured (placeholder Polar credentials).
 */
export async function createCheckout(
  input: CreateCheckoutInput,
): Promise<CheckoutResult> {
  const pack = getPack(input.packId);
  if (!pack) {
    throw HttpError.badRequest("Unknown billing pack");
  }

  if (!isPolarConfigured() || !pack.productId) {
    throw new HttpError(
      503,
      "Billing is not configured yet. Add Polar credentials and product ids.",
      "BILLING_NOT_CONFIGURED",
    );
  }

  try {
    const polar = getPolar();
    const checkout = await polar.checkouts.create({
      products: [pack.productId],
      successUrl: `${env.APP_URL}/billing?checkout=success`,
      externalCustomerId: input.userId,
      metadata: {
        userId: input.userId,
        packId: pack.id,
        credits: pack.credits,
      },
    });

    return { url: checkout.url };
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Unknown checkout error";
    throw HttpError.internal(`Failed to create checkout: ${message}`);
  }
}
