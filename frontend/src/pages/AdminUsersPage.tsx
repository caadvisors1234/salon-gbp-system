import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import DataTable, { Column } from "../components/DataTable";
import Badge from "../components/Badge";
import Button from "../components/Button";
import FormField, { inputClass, selectClass, checkboxClass } from "../components/FormField";
import Alert from "../components/Alert";
import { IconRefresh } from "../components/icons";

type Me = { role: string };
type User = { id: string; supabase_user_id: string; email: string; salon_id: string | null; role: string; is_active: boolean };
type Salon = { id: string; name: string; slug: string };

export default function AdminUsersPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    supabase_user_id: "",
    email: "",
    salon_id: "",
    role: "staff",
    display_name: "",
    is_active: true
  });

  useEffect(() => {
    document.title = "ユーザー管理 | サロンGBP管理";
  }, []);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [meRes, usersRes, salonsRes] = await Promise.all([
        apiFetch<Me>("/me", { token }),
        apiFetch<User[]>("/admin/users", { token }),
        apiFetch<Salon[]>("/admin/salons", { token })
      ]);
      setMe(meRes);
      setUsers(usersRes);
      setSalons(salonsRes);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (me && me.role !== "super_admin") {
    return <div className="py-12 text-center text-stone-500">アクセス権限がありません</div>;
  }

  const roleLabel = (role: string) => {
    switch (role) {
      case "super_admin": return "管理者";
      case "salon_admin": return "サロン管理者";
      default: return "スタッフ";
    }
  };

  const columns: Column<User>[] = [
    {
      key: "email",
      header: "メール",
      render: (u) => <span className="font-medium text-stone-900">{u.email}</span>,
    },
    {
      key: "role",
      header: "ロール",
      render: (u) => (
        <Badge variant={u.role === "super_admin" ? "error" : u.role === "salon_admin" ? "primary" : "default"}>
          {roleLabel(u.role)}
        </Badge>
      ),
    },
    {
      key: "salon",
      header: "サロン",
      render: (u) => <span className="text-xs text-stone-500">{u.salon_id ?? "—"}</span>,
    },
    {
      key: "active",
      header: "ステータス",
      render: (u) => <Badge variant={u.is_active ? "success" : "default"}>{u.is_active ? "有効" : "無効"}</Badge>,
    },
    {
      key: "supabase",
      header: "Supabase ID",
      render: (u) => <span className="text-xs text-stone-400 font-mono">{u.supabase_user_id.slice(0, 8)}...</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="ユーザー管理" description="Supabaseユーザーをサロン・ロールに割り当て" />
      {err && <Alert variant="error" message={err} dismissible onDismiss={() => setErr(null)} />}

      <Card title="ユーザー割り当て / 更新">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!token) return;
            setErr(null);
            try {
              await apiFetch("/admin/users/assign", {
                method: "POST",
                token,
                body: JSON.stringify({
                  supabase_user_id: form.supabase_user_id,
                  email: form.email,
                  salon_id: form.salon_id || null,
                  role: form.role,
                  display_name: form.display_name || null,
                  is_active: form.is_active
                })
              });
              setForm({ ...form, supabase_user_id: "", email: "" });
              await load();
            } catch (e2: any) {
              setErr(e2?.message ?? String(e2));
            }
          }}
        >
          <FormField label="Supabase ユーザーID (UUID)" className="sm:col-span-2">
            <input className={inputClass} value={form.supabase_user_id} onChange={(e) => setForm({ ...form, supabase_user_id: e.target.value })} required />
          </FormField>
          <FormField label="メールアドレス" className="sm:col-span-2">
            <input className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </FormField>
          <FormField label="サロン">
            <select className={selectClass} value={form.salon_id} onChange={(e) => setForm({ ...form, salon_id: e.target.value })}>
              <option value="">（なし）</option>
              {salons.map((s) => (
                <option key={s.id} value={s.id}>{s.slug}</option>
              ))}
            </select>
          </FormField>
          <FormField label="ロール">
            <select className={selectClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">スタッフ</option>
              <option value="salon_admin">サロン管理者</option>
              <option value="super_admin">管理者</option>
            </select>
          </FormField>
          <FormField label="表示名" className="sm:col-span-2">
            <input className={inputClass} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
            <input type="checkbox" className={checkboxClass} checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            有効
          </label>
          <div className="sm:col-span-2">
            <Button variant="primary" type="submit">保存</Button>
          </div>
        </form>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-medium text-stone-900">ユーザー一覧</h2>
        <Button variant="secondary" onClick={() => load()}>
          <IconRefresh className="h-4 w-4" />
          再読込
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={users}
        rowKey={(u) => u.id}
        loading={loading}
        emptyMessage="ユーザーがいません"
      />
    </div>
  );
}
