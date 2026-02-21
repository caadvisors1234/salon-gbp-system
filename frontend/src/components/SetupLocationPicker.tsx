import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { translateError } from "../lib/labels";
import Button from "./Button";
import Alert from "./Alert";
import { IconSpinner } from "./icons";
import type {
  GbpAvailableLocation,
  GbpConnectionListItem,
  GbpLocationResponse,
} from "../types/api";

interface SetupLocationPickerProps {
  onComplete: () => void;
}

export default function SetupLocationPicker({ onComplete }: SetupLocationPickerProps) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [connections, setConnections] = useState<GbpConnectionListItem[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);
  const [locations, setLocations] = useState<GbpAvailableLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch connections first, then available locations
  useEffect(() => {
    if (!token) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    apiFetch<GbpConnectionListItem[]>("/gbp/connections", { token, signal: ac.signal })
      .then((conns) => {
        setConnections(conns);
        const active = conns.find((c) => c.status === "active");
        const connId = active?.id ?? conns[0]?.id;
        if (connId) {
          setSelectedConnId(connId);
          return apiFetch<GbpAvailableLocation[]>(
            `/gbp/locations/available?connection_id=${connId}`,
            { token, signal: ac.signal },
          );
        }
        return Promise.resolve([]);
      })
      .then((locs) => {
        setLocations(locs);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setError(translateError(e?.message ?? String(e)));
        setLoading(false);
      });

    return () => ac.abort();
  }, [token]);

  // Refetch locations when connection changes
  const handleConnectionChange = async (connId: string) => {
    if (!token) return;
    setSelectedConnId(connId);
    setLocations([]);
    setSelected(null);
    setLoading(true);
    setError(null);
    try {
      const locs = await apiFetch<GbpAvailableLocation[]>(
        `/gbp/locations/available?connection_id=${connId}`,
        { token },
      );
      setLocations(locs);
    } catch (e: unknown) {
      setError(translateError(e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  const keyOf = (a: GbpAvailableLocation) => `${a.account_id}::${a.location_id}`;

  const handleSave = async () => {
    if (!token || !selected || !selectedConnId) return;
    const chosen = locations.find((l) => keyOf(l) === selected);
    if (!chosen) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch<GbpLocationResponse[]>("/gbp/locations/select", {
        method: "POST",
        token,
        body: JSON.stringify({
          gbp_connection_id: selectedConnId,
          location: {
            account_id: chosen.account_id,
            location_id: chosen.location_id,
            location_name: chosen.location_name ?? null,
            is_active: true,
          },
        }),
      });
      onComplete();
    } catch (e: unknown) {
      setError(translateError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <IconSpinner className="h-5 w-5 text-pink-500" />
        <span className="text-sm text-stone-500">店舗情報を取得中...</span>
      </div>
    );
  }

  if (error && locations.length === 0) {
    return <Alert variant="error" message={error} />;
  }

  if (locations.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        利用可能な店舗が見つかりませんでした。Googleビジネスプロフィールに店舗が登録されているか確認してください。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Connection selector when multiple connections exist */}
      {connections.length > 1 && (
        <div>
          <label htmlFor="setup-connection-select" className="mb-1 block text-xs font-medium text-stone-500">
            Googleアカウント
          </label>
          <select
            id="setup-connection-select"
            className="w-full max-w-xs rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-700 focus:border-pink-300 focus:outline-none focus:ring-1 focus:ring-pink-300"
            value={selectedConnId ?? ""}
            onChange={(e) => handleConnectionChange(e.target.value)}
          >
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.google_account_email || "（不明）"}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        {locations.map((loc) => {
          const k = keyOf(loc);
          return (
            <label
              key={k}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                selected === k
                  ? "border-pink-300 bg-pink-50"
                  : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
              }`}
            >
              <input
                type="radio"
                name="setup-location"
                className="h-4 w-4 border-stone-300 text-pink-600"
                checked={selected === k}
                onChange={() => setSelected(k)}
              />
              <span className="text-sm font-medium text-stone-800">
                {loc.location_name || "（名前なし）"}
              </span>
            </label>
          );
        })}
      </div>

      {error && <Alert variant="error" message={error} dismissible onDismiss={() => setError(null)} />}

      <Button variant="primary" loading={saving} disabled={!selected} onClick={handleSave}>
        この店舗に決定
      </Button>
    </div>
  );
}
