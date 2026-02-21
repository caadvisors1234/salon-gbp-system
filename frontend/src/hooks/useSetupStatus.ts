import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../lib/auth";
import { useMe } from "../lib/me";
import { apiFetch, SALON_CHANGED_EVENT } from "../lib/api";
import { SHOW_INSTAGRAM_UI } from "../lib/featureFlags";
import type { GbpConnectionResponse, GbpLocationResponse, InstagramAccountResponse } from "../types/api";

export interface SetupStatus {
  loading: boolean;
  error: boolean;
  /** True when this salon has a direct active GBP connection (via mapped location). */
  googleConnected: boolean;
  /** True when any active GBP connection exists globally (for wizard step progression). */
  googleConnectedGlobally: boolean;
  googleEmail: string | null;
  googleExpired: boolean;
  locationSelected: boolean;
  activeLocationName: string | null;
  instagramConnected: boolean;
  instagramUsername: string | null;
  allComplete: boolean;
  /** 1 = Google, 2 = Location, 3 = Instagram */
  currentStep: 1 | 2 | 3;
}

const INITIAL: SetupStatus = {
  loading: true,
  error: false,
  googleConnected: false,
  googleConnectedGlobally: false,
  googleEmail: null,
  googleExpired: false,
  locationSelected: false,
  activeLocationName: null,
  instagramConnected: false,
  instagramUsername: null,
  allComplete: false,
  currentStep: 1,
};

export function useSetupStatus(skip = false): SetupStatus & { refetch: () => void } {
  const { session } = useAuth();
  const { me } = useMe();
  const token = session?.access_token ?? null;
  const [status, setStatus] = useState<SetupStatus>(INITIAL);
  const counterRef = useRef(0);
  const activeAbort = useRef<AbortController | null>(null);

  // Skip for staff role
  const shouldSkip = skip || me?.role === "staff";

  const execute = useCallback(() => {
    activeAbort.current?.abort();
    activeAbort.current = null;

    if (!token || shouldSkip) {
      setStatus({ ...INITIAL, loading: false });
      return;
    }

    const id = ++counterRef.current;
    const ac = new AbortController();
    activeAbort.current = ac;

    const opts = { token, signal: ac.signal };

    Promise.allSettled([
      apiFetch<GbpConnectionResponse>("/gbp/connection", opts),
      apiFetch<GbpLocationResponse[]>("/gbp/locations", opts),
      apiFetch<InstagramAccountResponse[]>("/instagram/accounts", opts),
      apiFetch<{ exists: boolean }>("/gbp/connection/exists", opts),
    ]).then(([connResult, locsResult, igResult, existsResult]) => {
      if (id !== counterRef.current) return;

      const allFailed = connResult.status === "rejected"
        && locsResult.status === "rejected"
        && igResult.status === "rejected";

      const conn = connResult.status === "fulfilled" ? connResult.value : null;
      const locs = locsResult.status === "fulfilled" ? locsResult.value : [];
      const igAccounts = igResult.status === "fulfilled" ? igResult.value : [];
      const connExists = existsResult.status === "fulfilled" ? existsResult.value.exists : false;

      // Salon-specific: this salon has a mapped active connection
      const googleConnected = conn?.status === "active";
      // Global: any active connection exists (for wizard step progression)
      const googleConnectedGlobally = googleConnected || connExists;
      const googleExpired = conn?.status === "expired" || conn?.status === "revoked";
      const googleEmail = conn?.google_account_email ?? null;
      const activeLoc = locs.find((l) => l.is_active);
      const locationSelected = !!activeLoc;
      const activeLocationName = activeLoc?.location_name ?? null;
      const activeIg = igAccounts.find((a) => a.is_active);
      const instagramConnected = !!activeIg;
      const instagramUsername = activeIg?.ig_username ?? null;

      // Step progression uses the global check so super_admin can skip to location selection
      let currentStep: 1 | 2 | 3 = 1;
      if (googleConnectedGlobally) currentStep = 2;
      if (SHOW_INSTAGRAM_UI && googleConnectedGlobally && locationSelected) currentStep = 3;

      setStatus({
        loading: false,
        error: allFailed,
        googleConnected,
        googleConnectedGlobally,
        googleEmail,
        googleExpired,
        locationSelected,
        activeLocationName,
        instagramConnected,
        instagramUsername,
        allComplete: SHOW_INSTAGRAM_UI
          ? googleConnected && locationSelected && instagramConnected
          : googleConnected && locationSelected,
        currentStep,
      });
    });
  }, [token, shouldSkip]);

  useEffect(() => {
    execute();
    return () => {
      activeAbort.current?.abort();
      activeAbort.current = null;
    };
  }, [execute]);

  // Refetch on salon change
  useEffect(() => {
    const handler = () => execute();
    window.addEventListener(SALON_CHANGED_EVENT, handler);
    return () => window.removeEventListener(SALON_CHANGED_EVENT, handler);
  }, [execute]);

  return { ...status, refetch: execute };
}
