import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthState = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, loading: true });

const REFRESH_CHECK_INTERVAL = 60_000; // 60 seconds
const REFRESH_BEFORE_EXPIRY = 5 * 60; // 5 minutes in seconds

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Proactive token refresh
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const interval = setInterval(() => {
      if (!session?.expires_at) return;
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at - now < REFRESH_BEFORE_EXPIRY) {
        client.auth.refreshSession().then(({ data, error }) => {
          if (error) {
            setSession(null);
          } else if (data.session) {
            setSession(data.session);
          }
        });
      }
    }, REFRESH_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [session]);

  const value = useMemo(() => ({ session, loading }), [session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
