"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { createBrowserClient } from "@/lib/supabase/client";

export interface UseUserResult {
  user: User | null;
  loading: boolean;
}

/**
 * Client hook exposing the current Supabase user and reacting to auth changes.
 */
export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    let active = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (active) {
          setUser(data.user);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setLoading(false);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
