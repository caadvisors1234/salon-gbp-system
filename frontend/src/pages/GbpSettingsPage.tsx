import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Badge, { statusVariant } from "../components/Badge";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { IconRefresh } from "../components/icons";
import { formatDateTime } from "../lib/format";
import type { GbpConnectionResponse, GbpLocationResponse, GbpAvailableLocation } from "../types/api";

export default function GbpSettingsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [search] = useSearchParams();
  const oauth = search.get("oauth");

  const [conn, setConn] = useState<GbpConnectionResponse | null>(null);
  const [connErr, setConnErr] = useState<string | null>(null);
  const [locations, setLocations] = useState<GbpLocationResponse[]>([]);
  const [available, setAvailable] = useState<GbpAvailableLocation[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const keyOf = (a: { account_id: string; location_id: string }) => `${a.account_id}::${a.location_id}`;

  useEffect(() => {
    document.title = "GBP設定 | サロンGBP管理";
  }, []);

  useEffect(() => {
    if (!token) return;
    const ac = new AbortController();
    setConnErr(null);
    apiFetch<GbpConnectionResponse>("/gbp/connection", { token, signal: ac.signal })
      .then((c) => setConn(c))
      .catch((e) => {
        if (e.name === "AbortError") return;
        setConn(null);
        setConnErr(e?.message ?? String(e));
      });
    apiFetch<GbpLocationResponse[]>("/gbp/locations", { token, signal: ac.signal })
      .then((locs) => setLocations(locs))
      .catch((e) => {
        if (e.name === "AbortError") return;
        setLocations([]);
      });
    return () => ac.abort();
  }, [token, oauth]);

  useEffect(() => {
    const s: Record<string, boolean> = {};
    for (const l of locations) s[keyOf(l)] = l.is_active;
    setSelected(s);
  }, [locations]);

  return (
    <div className="space-y-4">
      <PageHeader title="GBP設定" description="Googleアカウント接続とロケーション選択" />

      {oauth === "success" && <Alert variant="success" message="OAuth接続が完了しました" />}
      {oauth === "error" && <Alert variant="error" message="OAuth接続に失敗しました" />}

      {/* Connection */}
      <Card title="接続状態">
        <div className="flex items-start justify-between gap-4">
          <div>
            {conn ? (
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-stone-500">ステータス:</span>
                  <Badge variant={statusVariant(conn.status)}>{conn.status}</Badge>
                </div>
                <div><span className="text-stone-500">メール:</span> <span className="text-stone-800">{conn.google_account_email || "（不明）"}</span></div>
                <div><span className="text-stone-500">有効期限:</span> <span className="text-stone-800">{formatDateTime(conn.token_expires_at)}</span></div>
              </div>
            ) : (
              <p className="text-sm text-stone-500">未接続</p>
            )}
            {connErr && <p className="mt-2 text-xs text-stone-400">{connErr}</p>}
          </div>
          <Button
            variant="primary"
            onClick={async () => {
              if (!token) return;
              try {
                const res = await apiFetch<{ redirect_url: string }>("/oauth/google/start", {
                  token,
                  headers: { "x-requested-with": "fetch" },
                });
                window.location.href = res.redirect_url;
              } catch (e: any) {
                setErr(e?.message ?? String(e));
              }
            }}
          >
            接続 / 再接続
          </Button>
        </div>
      </Card>

      {/* Saved Locations */}
      <Card
        title="登録済みロケーション"
        description="データベースに保存されたGBPロケーション"
        action={
          <Button
            variant="secondary"
            onClick={async () => {
              if (!token) return;
              setBusy(true);
              setErr(null);
              setMsg(null);
              try {
                const locs = await apiFetch<GbpLocationResponse[]>("/gbp/locations", { token });
                setLocations(locs);
                setMsg("再読込しました");
              } catch (e2: any) {
                setErr(e2?.message ?? String(e2));
              } finally {
                setBusy(false);
              }
            }}
          >
            <IconRefresh className="h-4 w-4" />
            再読込
          </Button>
        }
      >
        {locations.length > 0 ? (
          <div className="-mx-5 -mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">有効</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">アカウント</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">ロケーション</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">名前</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {locations.map((l) => (
                  <tr key={l.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-stone-300 text-pink-600"
                        disabled={togglingId !== null}
                        checked={l.is_active}
                        onChange={async () => {
                          if (!token) return;
                          setTogglingId(l.id);
                          try {
                            const updated = await apiFetch<GbpLocationResponse>(`/gbp/locations/${l.id}`, {
                              method: "PATCH",
                              token,
                              body: JSON.stringify({ is_active: !l.is_active }),
                            });
                            setLocations((prev) => prev.map((x) => (x.id === l.id ? updated : x)));
                          } catch (ex: any) {
                            setErr(ex?.message ?? String(ex));
                          } finally {
                            setTogglingId(null);
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-stone-600">{l.account_id}</td>
                    <td className="px-4 py-3 text-stone-600">{l.location_id}</td>
                    <td className="px-4 py-3 text-stone-800">{l.location_name ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone-400">ロケーションが登録されていません</p>
        )}
      </Card>

      {/* Available Locations */}
      <Card
        title="利用可能なロケーション"
        description="Googleから取得（ベストエフォート）"
        action={
          <Button
            variant="secondary"
            loading={busy}
            onClick={async () => {
              if (!token) return;
              setBusy(true);
              setErr(null);
              setMsg(null);
              try {
                const locs = await apiFetch<GbpAvailableLocation[]>("/gbp/locations/available", { token });
                setAvailable(locs);
                setMsg(`${locs.length}件のロケーションを取得しました`);
              } catch (e2: any) {
                setErr(e2?.message ?? String(e2));
              } finally {
                setBusy(false);
              }
            }}
          >
            取得
          </Button>
        }
      >
        {available.length > 0 && (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">選択</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">アカウント</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">ロケーション</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">名前</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {available.map((a) => {
                  const k = keyOf(a);
                  return (
                    <tr key={k} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-stone-300 text-pink-600"
                          checked={!!selected[k]}
                          onChange={(e) => setSelected((prev) => ({ ...prev, [k]: e.target.checked }))}
                        />
                      </td>
                      <td className="px-4 py-3 text-stone-600">{a.account_id}</td>
                      <td className="px-4 py-3 text-stone-600">{a.location_id}</td>
                      <td className="px-4 py-3 text-stone-800">{a.location_name ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="primary"
            loading={busy}
            disabled={!token}
            onClick={async () => {
              if (!token) return;
              setBusy(true);
              setErr(null);
              setMsg(null);
              try {
                const chosen = available.filter((a) => selected[keyOf(a)]);
                const saved = await apiFetch<GbpLocationResponse[]>("/gbp/locations/select", {
                  method: "POST",
                  token,
                  body: JSON.stringify({
                    locations: chosen.map((c) => ({
                      account_id: c.account_id,
                      location_id: c.location_id,
                      location_name: c.location_name ?? null,
                      is_active: true
                    }))
                  })
                });
                setLocations(saved);
                setMsg(`${saved.length}件のロケーションを保存しました`);
              } catch (e2: any) {
                setErr(e2?.message ?? String(e2));
              } finally {
                setBusy(false);
              }
            }}
          >
            選択を保存
          </Button>
          {msg && <Alert variant="success" message={msg} autoHide onDismiss={() => setMsg(null)} />}
          {err && <Alert variant="error" message={err} dismissible onDismiss={() => setErr(null)} />}
        </div>
      </Card>
    </div>
  );
}
