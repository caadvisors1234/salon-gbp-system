import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useToast } from "../lib/toast";
import { translateError, connectionStatusLabel } from "../lib/labels";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Badge, { statusVariant } from "../components/Badge";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { IconSpinner } from "../components/icons";
import type {
  GbpConnectionListItem,
  BulkMappingItem,
  GbpAvailableLocation,
} from "../types/api";

interface AvailableByConnection {
  [connectionId: string]: GbpAvailableLocation[];
}

/** Encode a mapping selection as "connectionId::accountId::locationId" */
function encodeSelection(connectionId: string, accountId: string, locationId: string): string {
  return `${connectionId}::${accountId}::${locationId}`;
}

function decodeSelection(val: string): { connectionId: string; accountId: string; locationId: string } | null {
  const parts = val.split("::");
  if (parts.length !== 3) return null;
  return { connectionId: parts[0], accountId: parts[1], locationId: parts[2] };
}

/** Derive selections map from server mappings. */
function selectionsFromMappings(maps: BulkMappingItem[]): Record<string, string> {
  const sel: Record<string, string> = {};
  for (const m of maps) {
    if (m.gbp_location) {
      sel[m.salon_id] = encodeSelection(
        m.gbp_location.gbp_connection_id,
        m.gbp_location.account_id,
        m.gbp_location.location_id,
      );
    }
  }
  return sel;
}

export default function AdminBatchMappingPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle OAuth redirect feedback
  useEffect(() => {
    const oauth = searchParams.get("oauth");
    if (oauth === "success") {
      toast("success", "Googleアカウント連携が完了しました");
    } else if (oauth === "error") {
      toast("error", "Googleアカウント連携に失敗しました");
    }
    if (oauth) {
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [connections, setConnections] = useState<GbpConnectionListItem[]>([]);
  const [mappings, setMappings] = useState<BulkMappingItem[]>([]);
  const [availableByConn, setAvailableByConn] = useState<AvailableByConnection>({});
  const [selections, setSelections] = useState<Record<string, string>>({}); // salon_id -> encoded selection
  const [initialSelections, setInitialSelections] = useState<Record<string, string>>({}); // snapshot at load/save
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch connections and mappings independently so one failure doesn't block the other
      const [connsResult, mapsResult] = await Promise.allSettled([
        apiFetch<GbpConnectionListItem[]>("/gbp/connections", { token }),
        apiFetch<BulkMappingItem[]>("/gbp/bulk-mapping", { token }),
      ]);

      const conns = connsResult.status === "fulfilled" ? connsResult.value : [];
      const maps = mapsResult.status === "fulfilled" ? mapsResult.value : [];

      // Report first error encountered
      const firstError = [connsResult, mapsResult].find((r) => r.status === "rejected");
      if (firstError && firstError.status === "rejected") {
        const reason = firstError.reason;
        setError(translateError(reason instanceof Error ? reason.message : String(reason)));
      }

      setConnections(conns);
      setMappings(maps);

      // Initialize selections from current mappings
      const sel = selectionsFromMappings(maps);
      setSelections(sel);
      setInitialSelections(sel);

      // Fetch available locations per active connection
      const avail: AvailableByConnection = {};
      await Promise.all(
        conns.filter((c) => c.status === "active").map(async (c) => {
          try {
            const locs = await apiFetch<GbpAvailableLocation[]>(
              `/gbp/locations/available?connection_id=${c.id}`,
              { token },
            );
            avail[c.id] = locs;
          } catch {
            avail[c.id] = [];
          }
        }),
      );
      setAvailableByConn(avail);
    } catch (e: unknown) {
      setError(translateError(e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    document.title = "GBP一括マッピング | サロンGBP管理";
  }, []);

  const startOAuth = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch<{ redirect_url: string }>("/oauth/google/start", {
        token,
        headers: { "x-requested-with": "fetch" },
      });
      window.location.href = res.redirect_url;
    } catch (e: unknown) {
      setError(translateError(e instanceof Error ? e.message : String(e)));
    }
  }, [token]);

  const handleSave = useCallback(async () => {
    if (!token) return;

    // Only send rows that changed since last load/save
    const dirtyMappings = mappings.filter(
      (m) => (selections[m.salon_id] ?? "") !== (initialSelections[m.salon_id] ?? ""),
    );
    if (dirtyMappings.length === 0) {
      toast("info", "変更はありません");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const entries = dirtyMappings.map((m) => {
        const sel = selections[m.salon_id];
        const decoded = sel ? decodeSelection(sel) : null;
        if (decoded) {
          const locs = availableByConn[decoded.connectionId] ?? [];
          const loc = locs.find(
            (l) => l.account_id === decoded.accountId && l.location_id === decoded.locationId,
          );
          return {
            salon_id: m.salon_id,
            gbp_connection_id: decoded.connectionId,
            account_id: decoded.accountId,
            location_id: decoded.locationId,
            location_name: loc?.location_name ?? null,
          };
        }
        return {
          salon_id: m.salon_id,
          gbp_connection_id: null,
          account_id: null,
          location_id: null,
          location_name: null,
        };
      });

      const updated = await apiFetch<BulkMappingItem[]>("/gbp/bulk-mapping", {
        method: "POST",
        token,
        body: JSON.stringify({ mappings: entries }),
      });
      setMappings(updated);

      // Re-sync selections from server response
      const newSel = selectionsFromMappings(updated);
      setSelections(newSel);
      setInitialSelections(newSel);

      toast("success", "マッピングを保存しました");
    } catch (e: unknown) {
      setError(translateError(e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  }, [token, mappings, selections, initialSelections, availableByConn, toast]);

  // Build grouped options for the select dropdown
  const groupedOptions: { connectionId: string; email: string; locations: GbpAvailableLocation[] }[] =
    connections
      .filter((c) => c.status === "active")
      .map((c) => ({
        connectionId: c.id,
        email: c.google_account_email,
        locations: availableByConn[c.id] ?? [],
      }));

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="GBP一括マッピング" description="全サロンのGBPロケーション割り当てを一括管理" />
        <div className="flex items-center justify-center py-12">
          <IconSpinner className="h-6 w-6 text-pink-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="GBP一括マッピング"
        description="全サロンのGBPロケーション割り当てを一括管理"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={startOAuth}>
              Googleアカウントを連携
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              保存
            </Button>
          </div>
        }
      />

      {error && <Alert variant="error" message={error} dismissible onDismiss={() => setError(null)} />}

      {/* Connected accounts */}
      {connections.length > 0 && (
        <Card title="接続済みGoogleアカウント">
          <div className="flex flex-wrap gap-3">
            {connections.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm"
              >
                <span className="text-stone-700">{c.google_account_email || "（不明）"}</span>
                <Badge variant={statusVariant(c.status)}>{connectionStatusLabel(c.status)}</Badge>
                <span className="text-stone-400">({c.location_count}件)</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Mapping table */}
      <Card title="サロン別マッピング">
        {mappings.length > 0 ? (
          <div className="-mx-5 -mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    サロン名
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    現在のロケーション
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    割り当て
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {mappings.map((m) => (
                  <tr key={m.salon_id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3 font-medium text-stone-800">{m.salon_name}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {m.gbp_location ? (
                        <span>{m.gbp_location.location_name || "（名前なし）"}</span>
                      ) : (
                        <span className="text-stone-400">（未設定）</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-700 focus:border-pink-300 focus:outline-none focus:ring-1 focus:ring-pink-300"
                        value={selections[m.salon_id] ?? ""}
                        onChange={(e) =>
                          setSelections((prev) => ({ ...prev, [m.salon_id]: e.target.value }))
                        }
                      >
                        <option value="">（未割り当て）</option>
                        {groupedOptions.map((group) => (
                          <optgroup key={group.connectionId} label={group.email}>
                            {group.locations.map((loc) => (
                              <option
                                key={`${group.connectionId}::${loc.account_id}::${loc.location_id}`}
                                value={encodeSelection(group.connectionId, loc.account_id, loc.location_id)}
                              >
                                {loc.location_name || "（名前なし）"}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone-400">サロンが登録されていません</p>
        )}
      </Card>
    </div>
  );
}
