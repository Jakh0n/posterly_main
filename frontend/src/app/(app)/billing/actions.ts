"use server";

import { env } from "@/lib/env";
import { createServerClient } from "@/lib/supabase/server";

export interface CheckoutResult {
  url?: string;
  error?: string;
}

interface CheckoutResponse {
  success: boolean;
  data?: { url: string };
  error?: { message: string };
}

/**
 * Starts a Polar checkout for the given billing pack. Returns the redirect URL
 * on success, or a user-facing error (e.g. when billing isn't configured yet).
 * The authenticated user id is injected server-side and never trusted from the
 * client.
 */
export async function startCheckout(packId: string): Promise<CheckoutResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be signed in to upgrade." };
  }

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/billing/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, packId }),
    });

    const payload = (await res.json()) as CheckoutResponse;
    if (!res.ok || !payload.success || !payload.data) {
      return {
        error: payload.error?.message ?? "Could not start checkout.",
      };
    }

    return { url: payload.data.url };
  } catch {
    return { error: "Could not reach the billing service. Please try again." };
  }
}
