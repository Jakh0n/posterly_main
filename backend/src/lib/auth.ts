import type { Request } from "express";

import { createServerClient } from "./supabase";

export interface AuthenticatedUser {
  id: string;
}

/**
 * Resolves the Supabase user from a Bearer access token. Returns null when the
 * header is missing or the token is invalid/expired.
 */
export async function getUserFromRequest(
  req: Request,
): Promise<AuthenticatedUser | null> {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return null;
  }

  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return { id: data.user.id };
}
