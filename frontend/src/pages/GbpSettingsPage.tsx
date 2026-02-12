import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Badge, { statusVariant } from "../components/Badge";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { IconRefresh } from "../components/icons";
import { formatDateTime } from "../lib/format";
import { connectionStatusLabel } from "../lib/labels";
import { useGbpSettings, keyOf } from "../hooks/useGbpSettings";

export default function GbpSettingsPage() {
  const [search] = useSearchParams();
  const oauth = search.get("oauth");

  const {
    conn,
    connErr,
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
  } = useGbpSettings(oauth);

  useEffect(() => {
    document.title = "GBP設定 | サロンGBP管理";
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="GBP設定" description="Googleアカウントとの連携設定" />

      {oauth === "success" && <Alert variant="success" message="Googleアカウント連携が完了しました" />}
      {oauth === "error" && <Alert variant="error" message="Googleアカウント連携に失敗しました" />}

      {/* Connection */}
      <Card title="接続状態">
        <div className="flex items-start justify-between gap-4">
          <div>
            {conn ? (
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-stone-500">ステータス:</span>
                  <Badge variant={statusVariant(conn.status)}>{connectionStatusLabel(conn.status)}</Badge>
                </div>
                <div><span className="text-stone-500">メール:</span> <span className="text-stone-800">{conn.google_account_email || "（不明）"}</span></div>
                <div><span className="text-stone-500">有効期限:</span> <span className="text-stone-800">{formatDateTime(conn.token_expires_at)}</span></div>
              </div>
            ) : (
              <p className="text-sm text-stone-500">未接続</p>
            )}
            {connErr && <p className="mt-2 text-xs text-stone-400">{connErr}</p>}
          </div>
          <Button variant="primary" onClick={startOAuth}>
            接続 / 再接続
          </Button>
        </div>
      </Card>

      {/* Saved Locations */}
      <Card
        title="登録済みロケーション"
        description="登録済みのGBPロケーション"
        action={
          <Button variant="secondary" onClick={refreshLocations} aria-label="再読込">
            <IconRefresh className="h-4 w-4" />
          </Button>
        }
      >
        {locations.length > 0 ? (
          <div className="-mx-5 -mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">有効</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">アカウント</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">ロケーション</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">名前</th>
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
                        onChange={() => toggleLocation(l.id)}
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
        description="Googleから取得できるロケーション"
        action={
          <Button variant="secondary" loading={busy} onClick={fetchAvailable}>
            取得
          </Button>
        }
      >
        {available.length > 0 && (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">選択</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">アカウント</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">ロケーション</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">名前</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {available.map((a) => {
                  const k = keyOf(a);
                  return (
                    <tr key={k} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3">
                        <input
                          type="radio"
                          name="gbp-available-location"
                          className="h-4 w-4 rounded border-stone-300 text-pink-600"
                          checked={selected === k}
                          onChange={() => setSelected(k)}
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
          <Button variant="primary" loading={busy} onClick={saveSelected}>
            選択を保存
          </Button>
          {err && <Alert variant="error" message={err} dismissible onDismiss={() => setErr(null)} />}
        </div>
      </Card>
    </div>
  );
}
