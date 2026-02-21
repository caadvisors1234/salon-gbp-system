import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Badge, { statusVariant } from "../components/Badge";
import Button from "../components/Button";
import Alert from "../components/Alert";
import HelpIcon from "../components/HelpIcon";
import { IconRefresh } from "../components/icons";
import { connectionStatusLabel, HELP_TEXTS } from "../lib/labels";
import { useGbpSettings, keyOf } from "../hooks/useGbpSettings";

function tokenExpiryText(expiresAt: string): { text: string; variant: "success" | "warning" | "error" } {
  const now = Date.now();
  const exp = new Date(expiresAt).getTime();
  const daysLeft = Math.floor((exp - now) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return { text: "期限切れ", variant: "error" };
  if (daysLeft <= 7) return { text: `あと${daysLeft}日で期限切れ`, variant: "warning" };
  return { text: "正常に接続中", variant: "success" };
}

export default function GbpSettingsPage() {
  const [search] = useSearchParams();
  const oauth = search.get("oauth");

  const {
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
    clearAvailable,
  } = useGbpSettings(oauth);

  useEffect(() => {
    document.title = "GBP設定 | サロンGBP管理";
  }, []);

  const isConnected = conn?.status === "active";
  const isExpired = conn?.status === "expired" || conn?.status === "revoked";
  const expiry = conn ? tokenExpiryText(conn.token_expires_at) : null;

  // Determine button label and variant
  let connectLabel = "Googleアカウントを連携する";
  let connectVariant: "primary" | "secondary" | "danger" = "primary";
  if (isConnected) {
    connectLabel = "別のアカウントに切り替える";
    connectVariant = "secondary";
  } else if (isExpired) {
    connectLabel = "再連携する";
    connectVariant = "danger";
  }

  return (
    <div className="space-y-4">
      <PageHeader title="GBP設定" description="Googleビジネスプロフィールとの連携設定" />

      {oauth === "success" && <Alert variant="success" message="Googleアカウント連携が完了しました" />}
      {oauth === "error" && <Alert variant="error" message="Googleアカウント連携に失敗しました" />}

      {/* Connection */}
      <Card title="接続状態">
        <p className="mb-4 text-sm text-stone-500">
          {HELP_TEXTS.googleConnect}
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            {conn ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-stone-500">ステータス:</span>
                  <Badge variant={statusVariant(conn.status)}>{connectionStatusLabel(conn.status)}</Badge>
                </div>
                <div>
                  <span className="text-stone-500">メール:</span>{" "}
                  <span className="text-stone-800">{conn.google_account_email || "（不明）"}</span>
                </div>
                {expiry && (
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500">接続状態:</span>
                    <Badge variant={expiry.variant}>{expiry.text}</Badge>
                    <HelpIcon text={HELP_TEXTS.tokenExpiry} position="bottom" />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-stone-500">Googleアカウントが連携されていません</p>
            )}
            {connErr && <p className="mt-2 text-xs text-stone-400">{connErr}</p>}
          </div>
          <Button
            variant={connectVariant}
            onClick={startOAuth}
          >
            {connectLabel}
          </Button>
        </div>
        {isExpired && (
          <div className="mt-3">
            <Alert variant="error" message="Googleアカウントの認証が期限切れです。再連携してください。" />
          </div>
        )}
      </Card>

      {/* Saved Locations */}
      <Card
        title="登録済み店舗"
        description="投稿先として登録されている店舗"
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
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">店舗名</th>
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
                    <td className="px-4 py-3 text-stone-800">{l.location_name || "（名前なし）"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone-400">店舗が登録されていません</p>
        )}
      </Card>

      {/* Available Locations */}
      <Card
        title="店舗を選択"
        description="Googleアカウントに紐づく店舗を選んで登録します"
        action={
          <Button variant="secondary" loading={busy} onClick={fetchAvailable}>
            店舗を取得
          </Button>
        }
      >
        <p className="mb-3 text-sm text-stone-500">
          {HELP_TEXTS.locationSelect}
        </p>

        {/* Connection selector (when multiple connections exist) */}
        {connections.length > 1 && (
          <div className="mb-4">
            <label htmlFor="connection-select" className="mb-1 block text-xs font-medium text-stone-500">
              Googleアカウントを選択
            </label>
            <select
              id="connection-select"
              className="w-full max-w-xs rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-700 focus:border-pink-300 focus:outline-none focus:ring-1 focus:ring-pink-300"
              value={selectedConnectionId ?? ""}
              onChange={(e) => {
                setSelectedConnectionId(e.target.value || null);
                clearAvailable();
              }}
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.google_account_email || "（不明）"}
                </option>
              ))}
            </select>
          </div>
        )}

        {available.length > 0 && (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">選択</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">店舗名</th>
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
                      <td className="px-4 py-3 text-stone-800">{a.location_name || "（名前なし）"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <Button variant="primary" loading={busy} onClick={saveSelected}>
            この店舗に決定
          </Button>
          {err && <Alert variant="error" message={err} dismissible onDismiss={() => setErr(null)} />}
        </div>
      </Card>
    </div>
  );
}
