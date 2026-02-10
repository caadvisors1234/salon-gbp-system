import React, { useEffect } from "react";
import { useApiFetch } from "../hooks/useApiFetch";
import { apiFetch } from "../lib/api";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Alert from "../components/Alert";
import { IconSpinner } from "../components/icons";
import type { SalonResponse } from "../types/api";

export default function SalonSettingsPage() {
  const { data: salon, error: fetchErr } = useApiFetch<SalonResponse>(
    (t, s) => apiFetch("/salon/settings", { token: t, signal: s }),
  );

  useEffect(() => {
    document.title = "マイサロン | サロンGBP管理";
  }, []);

  if (!salon) {
    return (
      <div className="space-y-4">
        <PageHeader title="マイサロン" />
        {fetchErr
          ? <Alert variant="error" message={fetchErr} />
          : <div className="flex items-center justify-center py-12">
              <IconSpinner className="h-6 w-6 text-pink-500" />
            </div>
        }
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="マイサロン" description="サロン基本情報" />

      <Card>
        <div className="space-y-4">
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <div className="text-xs font-medium text-stone-500">サロン名</div>
            <div className="text-sm font-medium text-stone-900">{salon.name}</div>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <div className="text-xs font-medium text-stone-500">HotPepper Beauty サロンページURL</div>
            <div className="text-sm font-medium text-stone-900 break-all">
              {salon.hotpepper_top_url ?? "未設定"}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
