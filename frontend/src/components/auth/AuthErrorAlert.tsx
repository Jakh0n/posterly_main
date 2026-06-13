"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export interface AuthErrorAlertProps {
  error?: string;
  message?: string;
}

const ERROR_HINTS: Record<string, string> = {
  google:
    "Google OAuth is not configured yet. Enable Google under Supabase → Authentication → Providers, then add your Google Client ID and Secret.",
  auth: "Sign-in failed. Please try again.",
};

/**
 * Surfaces auth errors passed via query string (e.g. OAuth callback failures).
 */
export function AuthErrorAlert({ error, message }: AuthErrorAlertProps) {
  useEffect(() => {
    if (!error && !message) {
      return;
    }

    const hint = error ? ERROR_HINTS[error] : undefined;
    toast.error(message ?? hint ?? "Authentication failed");
  }, [error, message]);

  if (!error && !message) {
    return null;
  }

  const hint = error ? ERROR_HINTS[error] : undefined;

  return (
    <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message ?? hint ?? "Authentication failed. Please try again."}
    </div>
  );
}
