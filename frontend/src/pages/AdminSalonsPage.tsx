import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import DataTable, { Column } from "../components/DataTable";
import Badge from "../components/Badge";
import Button from "../components/Button";
import FormField, { inputClass } from "../components/FormField";
import Alert from "../components/Alert";
import { IconRefresh } from "../components/icons";
import type { MeResponse, SalonResponse } from "../types/api";

export default function AdminSalonsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [me, setMe] = useState<MeResponse | null>(null);
  const [salons, setSalons] = useState<SalonResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "" });

  useEffect(() => {
    document.title = "テナント管理 | サロンGBP管理";
  }, []);

  const load = async (signal?: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    try {
      const [meRes, salonsRes] = await Promise.all([
        apiFetch<MeResponse>("/me", { token, signal }),
        apiFetch<SalonResponse[]>("/admin/salons", { token, signal }),
      ]);
      setMe(meRes);
      setSalons(salonsRes);
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

  const columns: Column<SalonResponse>[] = [
    {
      key: "name",
      header: "サロン名",
      render: (s) => <span className="font-medium text-stone-900">{s.name}</span>,
    },
    {
      key: "slug",
      header: "スラグ",
      render: (s) => <span className="text-stone-600">{s.slug}</span>,
    },
    {
      key: "active",
      header: "ステータス",
      render: (s) => <Badge variant={s.is_active ? "success" : "default"}>{s.is_active ? "有効" : "無効"}</Badge>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="テナント管理" />
      {err && <Alert variant="error" message={err} dismissible onDismiss={() => setErr(null)} />}

      <Card title="サロンを作成">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!token) return;
            setErr(null);
            try {
              await apiFetch("/admin/salons", { method: "POST", token, body: JSON.stringify(form) });
              setForm({ name: "", slug: "" });
              await load();
            } catch (e2: any) {
              setErr(e2?.message ?? String(e2));
            }
          }}
        >
          <FormField label="サロン名">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          <FormField label="スラグ">
            <input className={inputClass} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          </FormField>
          <div className="sm:col-span-2">
            <Button variant="primary" type="submit">作成</Button>
          </div>
        </form>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-medium text-stone-900">サロン一覧</h2>
        <Button variant="secondary" onClick={() => load()}>
          <IconRefresh className="h-4 w-4" />
          再読込
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={salons}
        rowKey={(s) => s.id}
        loading={loading}
        emptyMessage="サロンがありません"
      />
    </div>
  );
}
