import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import PageHeader from "../components/PageHeader";
import DataTable, { Column } from "../components/DataTable";
import Badge, { statusVariant } from "../components/Badge";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { IconRefresh } from "../components/icons";
import type { MeResponse, SalonMonitorItem } from "../types/api";

export default function AdminMonitorPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [me, setMe] = useState<MeResponse | null>(null);
  const [items, setItems] = useState<SalonMonitorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    document.title = "モニター | サロンGBP管理";
  }, []);

  const load = async (signal?: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    try {
      const [meRes, monitorRes] = await Promise.all([
        apiFetch<MeResponse>("/me", { token, signal }),
        apiFetch<SalonMonitorItem[]>("/admin/monitor", { token, signal }),
      ]);
      setMe(meRes);
      setItems(monitorRes);
    } catch (e: any) {
      if (e.name === "AbortError") return;
      setErr(e?.message ?? String(e));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [token]);

  if (me && me.role !== "super_admin") {
    return <div className="py-12 text-center text-stone-500">アクセス権限がありません</div>;
  }

  const columns: Column<SalonMonitorItem>[] = [
    {
      key: "slug",
      header: "スラグ",
      render: (i) => <span className="font-medium text-stone-900">{i.slug}</span>,
    },
    {
      key: "name",
      header: "サロン名",
      render: (i) => <span className="text-stone-600">{i.name}</span>,
    },
    {
      key: "active",
      header: "ステータス",
      render: (i) => <Badge variant={i.is_active ? "success" : "default"}>{i.is_active ? "有効" : "無効"}</Badge>,
    },
    {
      key: "alerts",
      header: "未対応アラート",
      render: (i) => (
        <span className={i.open_alerts > 0 ? "font-semibold text-amber-600" : "text-stone-500"}>
          {i.open_alerts}
        </span>
      ),
    },
    {
      key: "gbp",
      header: "GBP接続",
      render: (i) => <Badge variant={statusVariant(i.gbp_connection_status)}>{i.gbp_connection_status}</Badge>,
    },
    {
      key: "locations",
      header: "有効ロケーション",
      render: (i) => <span className="text-stone-600">{i.active_locations}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="モニター"
        description="サロンごとの接続・アラート概況"
        action={
          <Button variant="secondary" onClick={() => load()}>
            <IconRefresh className="h-4 w-4" />
            再読込
          </Button>
        }
      />
      {err && <Alert variant="error" message={err} />}
      <DataTable
        columns={columns}
        data={items}
        rowKey={(i) => i.salon_id}
        loading={loading}
        emptyMessage="データがありません"
      />
    </div>
  );
}
