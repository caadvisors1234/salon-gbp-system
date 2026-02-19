import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { translateError } from "../lib/labels";
import Button from "./Button";
import Alert from "./Alert";
import { IconSpinner } from "./icons";
import type { GbpAvailableLocation, GbpLocationResponse } from "../types/api";

interface SetupLocationPickerProps {
  onComplete: () => void;
}

export default function SetupLocationPicker({ onComplete }: SetupLocationPickerProps) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [locations, setLocations] = useState<GbpAvailableLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    apiFetch<GbpAvailableLocation[]>("/gbp/locations/available", { token, signal: ac.signal })
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

  const keyOf = (a: GbpAvailableLocation) => `${a.account_id}::${a.location_id}`;

  const handleSave = async () => {
    if (!token || !selected) return;
    const chosen = locations.find((l) => keyOf(l) === selected);
    if (!chosen) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch<GbpLocationResponse[]>("/gbp/locations/select", {
        method: "POST",
        token,
        body: JSON.stringify({
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
