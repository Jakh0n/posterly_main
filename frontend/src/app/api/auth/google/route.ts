import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

interface SupabaseAuthError {
  msg?: string;
  message?: string;
  error_code?: string;
}

/**
 * Starts the Google OAuth flow server-side. Validates that the provider is
 * enabled before redirecting so users see a friendly error instead of raw JSON.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const redirectTo =
    searchParams.get("redirect_to") ??
    `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const fallback = `/signup?error=${encodeURIComponent("google")}`;

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error) {
      return NextResponse.redirect(
        `${origin}${fallback}&message=${encodeURIComponent(error.message)}`,
      );
    }

    if (!data.url) {
      return NextResponse.redirect(`${origin}${fallback}`);
    }

    const probe = await fetch(data.url, { method: "GET", redirect: "manual" });
    const contentType = probe.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await probe.json()) as SupabaseAuthError;
      const message = body.msg ?? body.message ?? "Google sign-in is unavailable";
      return NextResponse.redirect(
        `${origin}${fallback}&message=${encodeURIComponent(message)}`,
      );
    }

    return NextResponse.redirect(data.url);
  } catch {
    return NextResponse.redirect(`${origin}${fallback}`);
  }
}
