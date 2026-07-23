"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

let bootstrapPromise: Promise<Session> | null = null;

async function getOrCreateSession() {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  const currentPromise = (async () => {
    const supabase = createClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (session) {
      return session;
    }

    const { data, error } = await supabase.auth.signInAnonymously();

    if (error || !data.session) {
      throw error ?? new Error("O Supabase não retornou uma sessão anônima.");
    }

    return data.session;
  })();

  bootstrapPromise = currentPromise;
  void currentPromise.then(
    () => {
      if (bootstrapPromise === currentPromise) bootstrapPromise = null;
    },
    () => {
      if (bootstrapPromise === currentPromise) bootstrapPromise = null;
    }
  );

  return currentPromise;
}

export function useAnonymousSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    try {
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        if (nextSession) {
          setLoading(false);
        }
        setError(null);
      });
      unsubscribe = () => data.subscription.unsubscribe();

      void getOrCreateSession()
        .then((nextSession) => {
          if (!active) return;
          setSession(nextSession);
          setLoading(false);
        })
        .catch((sessionError: unknown) => {
          if (!active) return;
          setError(
            sessionError instanceof Error
              ? sessionError.message
              : "Não foi possível iniciar sua sessão."
          );
          setLoading(false);
        });
    } catch (sessionError) {
      queueMicrotask(() => {
        if (!active) return;
        setError(
          sessionError instanceof Error
            ? sessionError.message
            : "Não foi possível iniciar sua sessão."
        );
        setLoading(false);
      });
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    isAnonymous: session?.user.is_anonymous === true,
    loading,
    error,
  };
}
