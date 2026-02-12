import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useToast } from "../lib/toast";
import { useApiFetch } from "../hooks/useApiFetch";
import { validate, required, email as emailValidator, minLength } from "../lib/validation";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import DataTable, { Column } from "../components/DataTable";
import Badge from "../components/Badge";
import Button from "../components/Button";
import FormField, { inputClass, selectClass } from "../components/FormField";
import Alert from "../components/Alert";
import { IconEdit, IconRefresh, IconTrash } from "../components/icons";
import { roleLabel, translateError } from "../lib/labels";
import type { MeResponse, SalonResponse, AppUserResponse } from "../types/api";

export default function AdminUsersPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const { toast } = useToast();

  useEffect(() => {
    document.title = "ユーザー管理 | サロンGBP管理";
  }, []);

  const { data, loading, error, refetch } = useApiFetch<[MeResponse, AppUserResponse[], SalonResponse[]]>(
    (t, s) =>
      Promise.all([
        apiFetch<MeResponse>("/me", { token: t, signal: s }),
        apiFetch<AppUserResponse[]>("/admin/users", { token: t, signal: s }),
        apiFetch<SalonResponse[]>("/admin/salons", { token: t, signal: s }),
      ]),
  );

  const [me, users, salons] = data ?? [null, [], []];
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: "",
    password: "",
    salon_ids: [] as string[],
    role: "staff",
    display_name: "",
  });
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [inviteLoading, setInviteLoading] = useState(false);
  const [assignForm, setAssignForm] = useState({
    user_id: "",
    salon_ids: [] as string[],
  });
  const [assignLoading, setAssignLoading] = useState(false);

  if (me && me.role !== "super_admin") {
    return <div className="py-12 text-center text-stone-500">アクセス権限がありません</div>;
  }

  const validateInviteForm = () => {
    const errors: Record<string, string> = {};
    const emailErr = validate(inviteForm.email, required("メールアドレス"), emailValidator());
    if (emailErr) errors.email = emailErr;
    if (inviteForm.password) {
      const pwErr = validate(inviteForm.password, minLength(8));
      if (pwErr) errors.password = pwErr;
    }
    setInviteErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const salonLabelById = Object.fromEntries(salons.map((s) => [s.id, `${s.name} (${s.slug})`]));

  const columns: Column<AppUserResponse>[] = [
    {
      key: "email",
      header: "メール",
      render: (u) => <span className="font-medium text-stone-900">{u.email}</span>,
    },
    {
      key: "role",
      header: "権限",
      render: (u) => (
        <Badge variant={u.role === "super_admin" ? "error" : u.role === "salon_admin" ? "primary" : "default"}>
          {roleLabel(u.role)}
        </Badge>
      ),
    },
    {
      key: "salon",
      header: "サロン",
      render: (u) => (
        <span className="text-xs text-stone-500">
          {u.salon_ids.length > 0 ? u.salon_ids.map((id) => salonLabelById[id] ?? id).join(", ") : "—"}
        </span>
      ),
    },
    {
      key: "active",
      header: "ステータス",
      render: (u) => <Badge variant={u.is_active ? "success" : "default"}>{u.is_active ? "有効" : "無効"}</Badge>,
    },
    {
      key: "supabase",
      header: "ユーザーID",
      render: (u) => <span className="text-xs text-stone-400 font-mono">{u.supabase_user_id.slice(0, 8)}...</span>,
    },
    {
      key: "actions",
      header: "操作",
      render: (u) => {
        const isSelf = !!me && u.supabase_user_id === me.supabase_user_id;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              className="px-2 py-1"
              aria-label="所属サロンを編集"
              onClick={() => {
                setAssignForm({
                  user_id: u.supabase_user_id,
                  salon_ids: [...u.salon_ids],
                });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <IconEdit className="h-4 w-4" />
            </Button>
            {!isSelf && (
              <Button
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1"
                aria-label="ユーザーを削除"
                loading={deletingId === u.supabase_user_id}
                disabled={deletingId !== null}
                onClick={async () => {
                  if (!token) return;
                  if (!confirm(`${u.email} を削除しますか？`)) return;
                  setDeletingId(u.supabase_user_id);
                  setErr(null);
                  try {
                    await apiFetch(`/admin/users/${u.supabase_user_id}`, { method: "DELETE", token });
                    toast("success", "ユーザーを削除しました");
                    refetch();
                  } catch (ex: unknown) {
                    setErr(translateError(ex instanceof Error ? ex.message : String(ex)));
                  } finally {
                    setDeletingId(null);
                  }
                }}
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="ユーザー管理" description="ユーザーをサロン・権限に割り当て" />
      {(error || err) && <Alert variant="error" message={error || err!} dismissible onDismiss={() => setErr(null)} />}

      <Card title="ユーザー招待">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setInviteErrors({});
            if (!validateInviteForm()) return;
            if (!token) return;
            setErr(null);
            setInviteLoading(true);
            try {
              await apiFetch("/admin/users/invite", {
                method: "POST",
                token,
                body: JSON.stringify({
                  email: inviteForm.email,
                  password: inviteForm.password || null,
                  salon_ids: inviteForm.salon_ids,
                  role: inviteForm.role,
                  display_name: inviteForm.display_name || null,
                }),
              });
              setInviteForm({ email: "", password: "", salon_ids: [], role: "staff", display_name: "" });
              setInviteErrors({});
              toast("success", "ユーザーを招待しました");
              refetch();
            } catch (e2: unknown) {
              setErr(translateError(e2 instanceof Error ? e2.message : String(e2)));
            } finally {
              setInviteLoading(false);
            }
          }}
        >
          <FormField label="メールアドレス" className="sm:col-span-2" error={inviteErrors.email}>
            <input type="email" className={inputClass} value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} />
          </FormField>
          <FormField label="パスワード（任意・8文字以上）" className="sm:col-span-2" error={inviteErrors.password}>
            <input type="password" className={inputClass} value={inviteForm.password} onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })} />
          </FormField>
          <FormField label="サロン（複数選択可）">
            <select
              className={selectClass}
              multiple
              size={Math.min(6, Math.max(salons.length, 3))}
              value={inviteForm.salon_ids}
              onChange={(e) =>
                setInviteForm({
                  ...inviteForm,
                  salon_ids: Array.from(e.target.selectedOptions).map((o) => o.value),
                })
              }
            >
              {salons.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.slug})</option>
              ))}
            </select>
          </FormField>
          <FormField label="ロール">
            <select className={selectClass} value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
              <option value="staff">スタッフ</option>
              <option value="salon_admin">サロン管理者</option>
              <option value="super_admin">管理者</option>
            </select>
          </FormField>
          <FormField label="表示名" className="sm:col-span-2">
            <input className={inputClass} value={inviteForm.display_name} onChange={(e) => setInviteForm({ ...inviteForm, display_name: e.target.value })} />
          </FormField>
          <div className="sm:col-span-2">
            <Button variant="primary" type="submit" disabled={inviteLoading}>
              {inviteLoading ? "招待中..." : "招待"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title="所属サロン更新" description="既存ユーザーの所属サロンを変更">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!token || !assignForm.user_id) return;
            setErr(null);
            setAssignLoading(true);
            try {
              await apiFetch(`/admin/users/${assignForm.user_id}/salons`, {
                method: "PUT",
                token,
                body: JSON.stringify({
                  salon_ids: assignForm.salon_ids,
                }),
              });
              toast("success", "所属サロンを更新しました");
              refetch();
            } catch (e2: unknown) {
              setErr(translateError(e2 instanceof Error ? e2.message : String(e2)));
            } finally {
              setAssignLoading(false);
            }
          }}
        >
          <FormField label="対象ユーザー" className="sm:col-span-2">
            <select
              className={selectClass}
              value={assignForm.user_id}
              onChange={(e) => {
                const userId = e.target.value;
                const target = users.find((u) => u.supabase_user_id === userId);
                setAssignForm({
                  user_id: userId,
                  salon_ids: target ? [...target.salon_ids] : [],
                });
              }}
            >
              <option value="">ユーザーを選択</option>
              {users.map((u) => (
                <option key={u.supabase_user_id} value={u.supabase_user_id}>
                  {u.email}（{roleLabel(u.role)}）
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="サロン（複数選択可）" className="sm:col-span-2">
            <select
              className={selectClass}
              multiple
              size={Math.min(6, Math.max(salons.length, 3))}
              disabled={!assignForm.user_id}
              value={assignForm.salon_ids}
              onChange={(e) =>
                setAssignForm({
                  ...assignForm,
                  salon_ids: Array.from(e.target.selectedOptions).map((o) => o.value),
                })
              }
            >
              {salons.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.slug})</option>
              ))}
            </select>
          </FormField>
          <div className="sm:col-span-2 text-xs text-stone-500">
            選択中: {assignForm.salon_ids.length}件
          </div>
          <div className="sm:col-span-2">
            <Button variant="primary" type="submit" disabled={assignLoading || !assignForm.user_id}>
              {assignLoading ? "更新中..." : "所属サロンを更新"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-medium text-stone-900">ユーザー一覧</h2>
        <Button variant="secondary" onClick={refetch} aria-label="再読込">
          <IconRefresh className="h-4 w-4" />
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
