import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useToast } from "../lib/toast";
import { useApiFetch } from "../hooks/useApiFetch";
import { hotpepperUrl as hotpepperUrlValidator, validate } from "../lib/validation";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Button from "../components/Button";
import FormField, { inputClass } from "../components/FormField";
import Alert from "../components/Alert";
import { IconSpinner } from "../components/icons";
import { translateError } from "../lib/labels";
import type { SalonResponse } from "../types/api";

export default function SalonSettingsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const { toast } = useToast();

  const { data: fetchedSalon, error: fetchErr } = useApiFetch<SalonResponse>(
    (t, s) => apiFetch("/salon/settings", { token: t, signal: s }),
  );

  const [salon, setSalon] = useState<SalonResponse | null>(null);
  const [savedTopUrl, setSavedTopUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "マイサロン | サロンGBP管理";
  }, []);

  useEffect(() => {
    if (fetchedSalon) {
      setSalon(fetchedSalon);
      setSavedTopUrl(fetchedSalon.hotpepper_top_url ?? null);
    }
  }, [fetchedSalon]);

  useEffect(() => {
    if (fetchErr) setErr(fetchErr);
  }, [fetchErr]);

  // Validate URL on change
  useEffect(() => {
    const currentUrl = salon?.hotpepper_top_url ?? "";
    if (currentUrl) {
      setUrlError(validate(currentUrl, hotpepperUrlValidator()));
    } else {
      setUrlError(null);
    }
  }, [salon?.hotpepper_top_url]);

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
          <div>
            <div className="text-xs font-medium text-stone-500">サロン名</div>
            <div className="text-sm font-medium text-stone-900">{salon.name}</div>
          </div>
        </div>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (urlError) return;
            if (!token) return;
            setBusy(true);
            setErr(null);
            try {
              const topUrlChanged = (salon.hotpepper_top_url ?? null) !== savedTopUrl;
              const updated = await apiFetch<SalonResponse>("/salon/settings", {
                method: "PUT",
                token,
                body: JSON.stringify({
                  ...(topUrlChanged ? { hotpepper_top_url: salon.hotpepper_top_url ?? "" } : {}),
                }),
              });
              setSalon(updated);
              setSavedTopUrl(updated.hotpepper_top_url ?? null);
              toast("success", "保存しました");
            } catch (e2: unknown) {
              setErr(translateError(e2 instanceof Error ? e2.message : String(e2)));
            } finally {
              setBusy(false);
            }
          }}
        >
          <FormField label="HotPepper Beauty サロンページURL" error={urlError ?? undefined}>
            <input
              className={inputClass}
              placeholder="https://beauty.hotpepper.jp/slnH000232182/"
              value={salon.hotpepper_top_url ?? ""}
              onChange={(e) => setSalon({ ...salon, hotpepper_top_url: e.target.value || null })}
            />
          </FormField>

          {err && <Alert variant="error" message={err} dismissible onDismiss={() => setErr(null)} />}

          <div>
            <Button variant="primary" loading={busy} type="submit" disabled={!!urlError}>
              保存
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
