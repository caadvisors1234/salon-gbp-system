import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import FormField, { inputClass, checkboxClass } from "../components/FormField";
import Alert from "../components/Alert";
import { IconSpinner } from "../components/icons";

type Salon = {
  id: string;
  name: string;
  slug: string;
  hotpepper_salon_id?: string | null;
  hotpepper_blog_url?: string | null;
  hotpepper_style_url?: string | null;
  hotpepper_coupon_url?: string | null;
  is_active: boolean;
};

export default function SalonSettingsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [salon, setSalon] = useState<Salon | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    document.title = "サロン設定 | サロンGBP管理";
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch<Salon>("/salon/settings", { token })
      .then(setSalon)
      .catch((e) => setErr(e?.message ?? String(e)));
  }, [token]);

  if (!salon) {
    return (
      <div className="space-y-4">
        <PageHeader title="サロン設定" />
        <div className="flex items-center justify-center py-12">
          <IconSpinner className="h-6 w-6 text-pink-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="サロン設定" description="HotPepper URL・基本情報" />

      <Card>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!token) return;
            setBusy(true);
            setErr(null);
            setMsg(null);
            try {
              const updated = await apiFetch<Salon>("/salon/settings", {
                method: "PUT",
                token,
                body: JSON.stringify({
                  name: salon.name,
                  slug: salon.slug,
                  hotpepper_salon_id: salon.hotpepper_salon_id ?? null,
                  hotpepper_blog_url: salon.hotpepper_blog_url ?? null,
                  hotpepper_style_url: salon.hotpepper_style_url ?? null,
                  hotpepper_coupon_url: salon.hotpepper_coupon_url ?? null,
                  is_active: salon.is_active
                })
              });
              setSalon(updated);
              setMsg("保存しました");
            } catch (e2: any) {
              setErr(e2?.message ?? String(e2));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="サロン名">
              <input
                className={inputClass}
                value={salon.name}
                onChange={(e) => setSalon({ ...salon, name: e.target.value })}
              />
            </FormField>
            <FormField label="スラグ">
              <input
                className={inputClass}
                value={salon.slug}
                onChange={(e) => setSalon({ ...salon, slug: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="HotPepper サロンID（slnH以降）">
            <input
              className={inputClass}
              value={salon.hotpepper_salon_id ?? ""}
              onChange={(e) => setSalon({ ...salon, hotpepper_salon_id: e.target.value || null })}
            />
          </FormField>
          <FormField label="ブログURL（オプション）">
            <input
              className={inputClass}
              value={salon.hotpepper_blog_url ?? ""}
              onChange={(e) => setSalon({ ...salon, hotpepper_blog_url: e.target.value || null })}
            />
          </FormField>
          <FormField label="スタイルURL（オプション）">
            <input
              className={inputClass}
              value={salon.hotpepper_style_url ?? ""}
              onChange={(e) => setSalon({ ...salon, hotpepper_style_url: e.target.value || null })}
            />
          </FormField>
          <FormField label="クーポンURL（オプション）">
            <input
              className={inputClass}
              value={salon.hotpepper_coupon_url ?? ""}
              onChange={(e) => setSalon({ ...salon, hotpepper_coupon_url: e.target.value || null })}
            />
          </FormField>
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
