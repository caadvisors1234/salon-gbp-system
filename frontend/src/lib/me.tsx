import React, { createContext, useContext, useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./auth";
import { apiFetch, getCurrentSalonId, setCurrentSalonId, SALON_CHANGED_EVENT } from "./api";
import type { MeResponse } from "../types/api";

interface MeState {
  me: MeResponse | null;
  loading: boolean;
  currentSalonId: string | null;
  setCurrentSalonId: (salonId: string | null) => void;
  refetchMe: () => void;
}

const MeContext = createContext<MeState>({
  me: null,
  loading: true,
  currentSalonId: null,
  setCurrentSalonId: () => {},
  refetchMe: () => {},
});

export function MeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [salonId, setSalonIdState] = useState<string | null>(() => getCurrentSalonId());
  const activeAbort = useRef<AbortController | null>(null);

  const fetchMe = useCallback(() => {
    activeAbort.current?.abort();
    activeAbort.current = null;

    if (!token) {
      setMe(null);
      setLoading(false);
      setCurrentSalonId(null);
      setSalonIdState(null);
      return;
    }
    setLoading(true);
    const ac = new AbortController();
    activeAbort.current = ac;
    apiFetch<MeResponse>("/me", { token, signal: ac.signal })
      .then((meResp) => {
        setMe(meResp);
        const availableSalonIds = new Set(meResp.salon_ids);
        const storedSalonId = getCurrentSalonId();
        const nextSalonId = [storedSalonId, ...meResp.salon_ids].find(
          (id): id is string => !!id && availableSalonIds.has(id),
        ) ?? null;
        setCurrentSalonId(nextSalonId);
        setSalonIdState(nextSalonId);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setMe(null);
        setSalonIdState(getCurrentSalonId());
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    fetchMe();
    return () => {
      activeAbort.current?.abort();
      activeAbort.current = null;
    };
  }, [fetchMe]);

  const handleSetSalonId = useCallback((id: string | null) => {
    setCurrentSalonId(id);
    setSalonIdState(id);
  }, []);

  // Listen for external salon changes
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSalonIdState(detail?.salonId ?? null);
    };
    window.addEventListener(SALON_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SALON_CHANGED_EVENT, handler);
  }, []);

  const value = useMemo<MeState>(
    () => ({
      me,
      loading,
      currentSalonId: salonId,
      setCurrentSalonId: handleSetSalonId,
      refetchMe: fetchMe,
    }),
    [me, loading, salonId, handleSetSalonId, fetchMe],
  );

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMe(): MeState {
  return useContext(MeContext);
}
