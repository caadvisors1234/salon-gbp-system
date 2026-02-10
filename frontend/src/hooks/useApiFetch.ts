import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";
import { translateError } from "../lib/labels";

/**
 * Generic data-fetching hook that handles auth token injection, AbortController,
 * loading/error state, and automatic refetching on dependency changes.
 *
 * Pass `null` as fetcher to skip fetching (conditional fetch).
 */
export function useApiFetch<T>(
  fetcher: ((token: string, signal: AbortSignal) => Promise<T>) | null,
  deps: unknown[] = [],
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!fetcher);
  const [error, setError] = useState<string | null>(null);
  const counter = useRef(0);
  const activeAbort = useRef<AbortController | null>(null);

  const abortActive = useCallback(() => {
    activeAbort.current?.abort();
    activeAbort.current = null;
  }, []);

  const execute = useCallback(() => {
    abortActive();
    if (!fetcher || !token) {
      setLoading(false);
      return;
    }
    const id = ++counter.current;
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    activeAbort.current = ac;
    fetcher(token, ac.signal)
      .then((result) => {
        if (id !== counter.current) return;
        setData(result);
        setLoading(false);
        if (activeAbort.current === ac) activeAbort.current = null;
      })
      .catch((e) => {
        if (id !== counter.current) return;
        if (e?.name === "AbortError") {
          if (activeAbort.current === ac) activeAbort.current = null;
          return;
        }
        setError(translateError(e instanceof Error ? e.message : String(e)));
        setLoading(false);
        if (activeAbort.current === ac) activeAbort.current = null;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, fetcher, abortActive]);

  useEffect(() => {
    execute();
    return abortActive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, ...deps]);

  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch };
}
