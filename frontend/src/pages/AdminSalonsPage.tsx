import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useToast } from "../lib/toast";
import { useApiFetch } from "../hooks/useApiFetch";
import { validate, required, slug as slugValidator, maxLength } from "../lib/validation";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import DataTable, { Column } from "../components/DataTable";
import Button from "../components/Button";
import FormField, { inputClass } from "../components/FormField";
import Alert from "../components/Alert";
import { IconRefresh } from "../components/icons";
import { translateError } from "../lib/labels";
import type { MeResponse, SalonResponse } from "../types/api";

export default function AdminSalonsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const { toast } = useToast();

  useEffect(() => {
    document.title = "サロン管理 | サロンGBP管理";
  }, []);

  const { data, loading, error, refetch } = useApiFetch<[MeResponse, SalonResponse[]]>(
    (t, s) =>
      Promise.all([
        apiFetch<MeResponse>("/me", { token: t, signal: s }),
        apiFetch<SalonResponse[]>("/admin/salons", { token: t, signal: s }),
      ]),
  );

  const [me, salons] = data ?? [null, []];
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  if (me && me.role !== "super_admin") {
    return <div className="py-12 text-center text-stone-500">アクセス権限がありません</div>;
  }

  const validateSalonForm = () => {
    const errors: Record<string, string> = {};
    const nameErr = validate(form.name, required("サロン名"), maxLength(100));
    if (nameErr) errors.name = nameErr;
    const slugErr = validate(form.slug, required("スラグ"), slugValidator(), maxLength(50));
    if (slugErr) errors.slug = slugErr;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="サロン管理" />
      {(error || err) && <Alert variant="error" message={error || err!} dismissible onDismiss={() => setErr(null)} />}

      <Card title="サロンを作成">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!validateSalonForm()) return;
            if (!token) return;
            setErr(null);
            try {
              await apiFetch("/admin/salons", { method: "POST", token, body: JSON.stringify(form) });
              setForm({ name: "", slug: "" });
              setFormErrors({});
              toast("success", "サロンを作成しました");
              refetch();
            } catch (e2: unknown) {
              setErr(translateError(e2 instanceof Error ? e2.message : String(e2)));
            }
          }}
        >
          <FormField label="サロン名" error={formErrors.name}>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="スラグ" error={formErrors.slug}>
            <input className={inputClass} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </FormField>
          <div className="sm:col-span-2">
            <Button variant="primary" type="submit">作成</Button>
          </div>
        </form>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-medium text-stone-900">サロン一覧</h2>
        <Button variant="secondary" onClick={refetch} aria-label="再読込">
          <IconRefresh className="h-4 w-4" />
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
