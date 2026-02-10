import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import FormField, { inputClass, checkboxClass } from "../components/FormField";
import Alert from "../components/Alert";
import { IconSpinner } from "../components/icons";
import type { SalonResponse } from "../types/api";

// NOTE: パターンはバックエンド (schemas/salon.py _HOTPEPPER_RE) と同一。
// URL形式変更時は両方を更新すること。
function parseHotpepperUrl(url: string) {
  const m = url.match(/beauty\.hotpepper\.jp\/slnH([a-zA-Z0-9]+)/);
  if (!m) return null;
  const id = m[1];
  const base = `https://beauty.hotpepper.jp/slnH${id}`;
  return {
    salonId: id,
    blogUrl: `${base}/blog/`,
    styleUrl: `${base}/style/`,
    couponUrl: `${base}/coupon/`,
  };
}

function HotpepperPreview({ url }: { url: string }) {
  const parsed = parseHotpepperUrl(url);
  if (!parsed) return null;
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600 space-y-1">
      <p><span className="font-medium text-stone-700">サロンID:</span> {parsed.salonId}</p>
      <p><span className="font-medium text-stone-700">ブログURL:</span> {parsed.blogUrl}</p>
      <p><span className="font-medium text-stone-700">スタイルURL:</span> {parsed.styleUrl}</p>
      <p><span className="font-medium text-stone-700">クーポンURL:</span> {parsed.couponUrl}</p>
    </div>
  );
}

export default function SalonSettingsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [salon, setSalon] = useState<SalonResponse | null>(null);
  const [savedTopUrl, setSavedTopUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    document.title = "マイサロン | サロンGBP管理";
  }, []);

  useEffect(() => {
    if (!token) return;
    const ac = new AbortController();
    apiFetch<SalonResponse>("/salon/settings", { token, signal: ac.signal })
      .then((data) => {
        setSalon(data);
        setSavedTopUrl(data.hotpepper_top_url ?? null);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setErr(e?.message ?? String(e));
      });
    return () => ac.abort();
  }, [token]);

  if (!salon) {
    return (
      <div className="space-y-4">
        <PageHeader title="マイサロン" />
        <div className="flex items-center justify-center py-12">
          <IconSpinner className="h-6 w-6 text-pink-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="マイサロン" description="HotPepper URL・基本情報" />

      <Card>
        <div className="mb-4 rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-stone-500">サロン名</div>
              <div className="text-sm font-medium text-stone-900">{salon.name}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-stone-500">スラグ</div>
              <div className="text-sm font-medium text-stone-900">{salon.slug}</div>
            </div>
          </div>
        </div>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!token) return;
            setBusy(true);
            setErr(null);
            setMsg(null);
            try {
              const topUrlChanged = (salon.hotpepper_top_url ?? null) !== savedTopUrl;
              // hotpepper_top_url: 未送信(省略)=変更なし, ""=連携解除, URL文字列=更新
              const updated = await apiFetch<SalonResponse>("/salon/settings", {
                method: "PUT",
                token,
                body: JSON.stringify({
                  ...(topUrlChanged ? { hotpepper_top_url: salon.hotpepper_top_url ?? "" } : {}),
                  is_active: salon.is_active
                })
              });
              setSalon(updated);
              setSavedTopUrl(updated.hotpepper_top_url ?? null);
              setMsg("保存しました");
            } catch (e2: any) {
              setErr(e2?.message ?? String(e2));
            } finally {
              setBusy(false);
            }
          }}
        >
          <FormField label="HotPepper Beauty サロンページURL">
            <input
              className={inputClass}
              placeholder="https://beauty.hotpepper.jp/slnH000232182/"
              value={salon.hotpepper_top_url ?? ""}
              onChange={(e) => setSalon({ ...salon, hotpepper_top_url: e.target.value || null })}
            />
          </FormField>
          <HotpepperPreview url={salon.hotpepper_top_url ?? ""} />
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              className={checkboxClass}
              checked={salon.is_active}
              onChange={(e) => setSalon({ ...salon, is_active: e.target.checked })}
            />
            有効
          </label>

          {msg && <Alert variant="success" message={msg} autoHide onDismiss={() => setMsg(null)} />}
          {err && <Alert variant="error" message={err} dismissible onDismiss={() => setErr(null)} />}

          <div>
            <Button variant="primary" loading={busy} type="submit">
              保存
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
