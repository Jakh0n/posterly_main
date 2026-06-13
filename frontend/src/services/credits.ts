import { createServerClient } from "@/lib/supabase/server";

/**
 * Reads the user's current credit balance via the `get_credit_balance` RPC.
 * Returns 0 on any failure so the UI can always render. Server-only.
 */
export async function getCreditBalance(userId: string): Promise<number> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.rpc("get_credit_balance", {
      p_user_id: userId,
    });

    if (error || typeof data !== "number") {
      return 0;
    }

    return data;
  } catch {
    return 0;
  }
}
