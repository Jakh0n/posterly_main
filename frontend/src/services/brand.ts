import { createServerClient } from "@/lib/supabase/server";
import type { Brand } from "@/types/brand";

/**
 * Returns the current user's brand (v1 = single brand per user), or null.
 * RLS ensures only the owner's row is returned. Server-only.
 */
export async function getBrand(): Promise<Brand | null> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as Brand;
  } catch {
    return null;
  }
}
