import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useToast } from "../lib/toast";
import { translateError } from "../lib/labels";
import type {
  GbpConnectionResponse,
  GbpConnectionListItem,
  GbpLocationResponse,
  GbpAvailableLocation,
} from "../types/api";

const keyOf = (a: { account_id: string; location_id: string }) => `${a.account_id}::${a.location_id}`;

export function useGbpSettings(oauthParam: string | null) {
  const { session } = useAuth();
  const token = session?.access_token;
  const { toast } = useToast();

  const [conn, setConn] = useState<GbpConnectionResponse | null>(null);
  const [connErr, setConnErr] = useState<string | null>(null);
  const [connections, setConnections] = useState<GbpConnectionListItem[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [locations, setLocations] = useState<GbpLocationResponse[]>([]);
  const [available, setAvailable] = useState<GbpAvailableLocation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!token) return;
    const ac = new AbortController();
    setConnErr(null);
    apiFetch<GbpConnectionResponse>("/gbp/connection", { token, signal: ac.signal })
      .then(setConn)
      .catch((e) => {
        if (e.name === "AbortError") return;
        setConn(null);
        setConnErr(translateError(e?.message ?? String(e)));
      });
    apiFetch<GbpLocationResponse[]>("/gbp/locations", { token, signal: ac.signal })
      .then(setLocations)
      .catch((e) => {
        if (e.name === "AbortError") return;
        setLocations([]);
      });
    // Fetch all connections for the connection selector
    apiFetch<GbpConnectionListItem[]>("/gbp/connections", { token, signal: ac.signal })
      .then((conns) => {
        setConnections(conns);
        // Only set initial value if not already selected (functional updater avoids stale closure)
        if (conns.length > 0) {
          setSelectedConnectionId((prev) => prev ?? conns[0].id);
        }
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setConnections([]);
      });
    return () => ac.abort();
  }, [token]);

  useEffect(() => {
    const cleanup = fetchData();
    return cleanup;
  }, [token, oauthParam]);

  useEffect(() => {
    const active = locations.find((l) => l.is_active);
    setSelected(active ? keyOf(active) : null);
  }, [locations]);

  const startOAuth = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch<{ redirect_url: string }>("/oauth/google/start", {
        token,
        headers: { "x-requested-with": "fetch" },
      });
      window.location.href = res.redirect_url;
    } catch (e: unknown) {
      setErr(translateError(e instanceof Error ? e.message : String(e)));
    }
  }, [token]);

  const refreshLocations = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const locs = await apiFetch<GbpLocationResponse[]>("/gbp/locations", { token });
      setLocations(locs);
      toast("success", "再読込しました");
    } catch (e: unknown) {
      setErr(translateError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }, [token, toast]);

  const fetchAvailable = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const connId = selectedConnectionId;
      const url = connId
        ? `/gbp/locations/available?connection_id=${connId}`
        : "/gbp/locations/available";
      const locs = await apiFetch<GbpAvailableLocation[]>(url, { token });
      setAvailable(locs);
      toast("success", `${locs.length}件のロケーションを取得しました`);
    } catch (e: unknown) {
      setErr(translateError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }, [token, selectedConnectionId, toast]);

  const saveSelected = useCallback(async () => {
    if (!token || !selectedConnectionId) return;
    setBusy(true);
    setErr(null);
    try {
      const chosen = available.find((a) => keyOf(a) === selected) ?? null;
      const saved = await apiFetch<GbpLocationResponse[]>("/gbp/locations/select", {
        method: "POST",
        token,
        body: JSON.stringify({
          gbp_connection_id: selectedConnectionId,
          location: chosen
            ? {
                account_id: chosen.account_id,
                location_id: chosen.location_id,
                location_name: chosen.location_name ?? null,
                is_active: true,
              }
            : null,
        }),
      });
      setLocations(saved);
      toast("success", `${saved.length}件のロケーションを保存しました`);
    } catch (e: unknown) {
      setErr(translateError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }, [token, available, selected, selectedConnectionId, toast]);

  const toggleLocation = useCallback(
    async (id: string) => {
      if (!token) return;
      setTogglingId(id);
      try {
        const loc = locations.find((l) => l.id === id);
        if (!loc) return;
        const updated = await apiFetch<GbpLocationResponse[]>(`/gbp/locations/${id}`, {
          method: "PATCH",
          token,
          body: JSON.stringify({ is_active: !loc.is_active }),
        });
        setLocations(updated);
      } catch (e: unknown) {
        setErr(translateError(e instanceof Error ? e.message : String(e)));
      } finally {
        setTogglingId(null);
      }
    },
    [token, locations],
  );

  return {
    conn,
    connErr,
    connections,
    selectedConnectionId,
    setSelectedConnectionId,
    locations,
    available,
    selected,
    setSelected,
    busy,
    err,
    setErr,
    togglingId,
    startOAuth,
    refreshLocations,
    fetchAvailable,
    saveSelected,
    toggleLocation,
    clearAvailable: () => setAvailable([]),
    refetch: fetchData,
  };
}

export { keyOf };
