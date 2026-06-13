import type { User } from "@supabase/supabase-js";

import { createServerClient } from "@/lib/supabase/server";

/**
 * Returns the currently authenticated user from the server-side session,
 * or null when the request is unauthenticated. Server-only.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
}
