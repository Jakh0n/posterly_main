import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "./env";
import type { Database } from "../types/db";

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Supabase admin client using the service role key. This bypasses Row Level
 * Security, so it must only ever be used on the server.
 */
export function createServerClient(): SupabaseClient<Database> {
  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return cachedClient;
}
