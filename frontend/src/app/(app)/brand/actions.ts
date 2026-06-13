"use server";

import { revalidatePath } from "next/cache";

import { createServerClient } from "@/lib/supabase/server";
import { brandSchema } from "@/lib/validations/brand";

export interface SaveBrandInput {
  name: string;
  tone?: string;
  palette: string[];
  logoUrl?: string | null;
  sourceUrl?: string | null;
}

export interface SaveBrandResult {
  success: boolean;
  error?: string;
}

/**
 * Validates and upserts the current user's brand (v1 = single brand per user).
 * RLS-safe: uses the user's session, and writes are constrained to user_id.
 */
export async function saveBrand(input: SaveBrandInput): Promise<SaveBrandResult> {
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid brand details";
    return { success: false, error: first };
  }

  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "You must be signed in" };
    }

    const row = {
      user_id: user.id,
      name: parsed.data.name,
      tone: parsed.data.tone || null,
      palette: parsed.data.palette,
      logo_url: parsed.data.logoUrl ?? null,
      source_url: parsed.data.sourceUrl ?? null,
    };

    // App-level "single brand per user" upsert: update the existing row if any,
    // otherwise insert a new one. RLS guarantees we only ever see our own.
    const { data: existing, error: selectError } = await supabase
      .from("brands")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (selectError) {
      return { success: false, error: selectError.message };
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("brands")
        .update(row)
        .eq("id", existing.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      const { error: insertError } = await supabase.from("brands").insert(row);

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    revalidatePath("/brand");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save brand";
    return { success: false, error: message };
  }
}
