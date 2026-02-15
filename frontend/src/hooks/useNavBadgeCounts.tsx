import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch, SALON_CHANGED_EVENT } from "../lib/api";

const POLL_INTERVAL = 60_000;

type BadgeCounts = Record<string, number>;

interface NavCountsResponse {
  pending_posts: number;
  pending_media: number;
  open_alerts: number;
}

interface NavBadgeCountsValue {
  counts: BadgeCounts;
  loading: boolean;
}

function toCounts(res: NavCountsResponse): BadgeCounts {
  const counts: BadgeCounts = {};
  if (res.pending_posts > 0) counts["/posts/pending"] = res.pending_posts;
  if (res.pending_media > 0) counts["/uploads/pending"] = res.pending_media;
  if (res.open_alerts > 0) counts["/alerts"] = res.open_alerts;
  return counts;
}

const NavBadgeCountsContext = createContext<NavBadgeCountsValue>({
  counts: {},
  loading: true,
});

export function NavBadgeCountsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [raw, setRaw] = useState<BadgeCounts>({});
  const [loading, setLoading] = useState(true);
  const counterRef = useRef(0);
  const activeAbort = useRef<AbortController | null>(null);

  const execute = useCallback(() => {
    activeAbort.current?.abort();
    activeAbort.current = null;

    if (!token) {
      setLoading(false);
      return;
    }

    const id = ++counterRef.current;
    const ac = new AbortController();
    activeAbort.current = ac;

    apiFetch<NavCountsResponse>("/nav/counts", { token, signal: ac.signal })
      .then((result) => {
        if (id !== counterRef.current) return;
        setRaw(toCounts(result));
        setLoading(false);
      })
      .catch((e) => {
        if (id !== counterRef.current) return;
        if (e?.name === "AbortError") return;
        // Silently ignore errors — badge is non-critical
        setLoading(false);
      });
  }, [token]);

  // Initial fetch + refetch when token changes
  useEffect(() => {
    execute();
    return () => {
      activeAbort.current?.abort();
      activeAbort.current = null;
    };
  }, [execute]);

  // Salon change listener
  useEffect(() => {
    const handler = () => execute();
    window.addEventListener(SALON_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SALON_CHANGED_EVENT, handler);
  }, [execute]);

  // Polling with visibility check
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) execute();
    }, POLL_INTERVAL);

    const onVisible = () => {
      if (!document.hidden) execute();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [execute]);

  return (
    <NavBadgeCountsContext.Provider value={{ counts: raw, loading }}>
      {children}
    </NavBadgeCountsContext.Provider>
  );
}

export function useNavBadgeCounts(): NavBadgeCountsValue {
  return useContext(NavBadgeCountsContext);
}
