import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useToast } from "../lib/toast";
import { validate, required } from "../lib/validation";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import FormField, { inputClass, selectClass, checkboxClass } from "../components/FormField";
import Alert from "../components/Alert";
import { IconTrash } from "../components/icons";
import { translateError } from "../lib/labels";
import type { InstagramAccountResponse } from "../types/api";

const INITIAL_FORM = {
  ig_user_id: "",
  ig_username: "",
  account_type: "official",
  staff_name: "",
  access_token: "",
  expires_in_days: 60,
  sync_hashtags: false,
};

export default function InstagramSettingsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const { toast } = useToast();
  const [search] = useSearchParams();
  const oauth = search.get("oauth");
  const added = search.get("added");
  const [accounts, setAccounts] = useState<InstagramAccountResponse[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = "Instagram設定 | サロンGBP管理";
  }, []);

  const load = async (signal?: AbortSignal) => {
    if (!token) return;
    const res = await apiFetch<InstagramAccountResponse[]>("/instagram/accounts", { token, signal });
    setAccounts(res);
  };

  useEffect(() => {
    if (!token) return;
    const ac = new AbortController();
    load(ac.signal).catch((e) => {
      if (e.name === "AbortError") return;
      setErr(translateError(e?.message ?? String(e)));
    });
    return () => ac.abort();
  }, [token]);

  const validateManualForm = () => {
    const errors: Record<string, string> = {};
    const igUserIdErr = validate(form.ig_user_id, required("Instagram ユーザーID"));
    if (igUserIdErr) errors.ig_user_id = igUserIdErr;
    const igUsernameErr = validate(form.ig_username, required("Instagram ユーザー名"));
    if (igUsernameErr) errors.ig_username = igUsernameErr;
    const tokenErr = validate(form.access_token, required("アクセストークン"));
    if (tokenErr) errors.access_token = tokenErr;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Instagram設定" description="Instagramアカウントを連携・登録" />

      {oauth === "success" && <Alert variant="success" message={`Instagram連携完了。追加/更新: ${added ?? "0"}件`} />}
      {oauth === "error" && <Alert variant="error" message="Instagram連携に失敗しました" />}
      {err && <Alert variant="error" message={err} dismissible onDismiss={() => setErr(null)} />}

      {/* OAuth Connect */}
      <Card title="Instagramアカウント連携">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={async () => {
              if (!token) return;
              try {
                const res = await apiFetch<{ redirect_url: string }>("/oauth/meta/start?account_type=official", {
                  token,
                  headers: { "x-requested-with": "fetch" },
                });
                window.location.href = res.redirect_url;
              } catch (e: unknown) {
                setErr(translateError(e instanceof Error ? e.message : String(e)));
              }
            }}
          >
            公式アカウント接続
          </Button>
          <div className="flex items-center gap-2">
            <input
              className={`${inputClass} w-40`}
              placeholder="スタッフ名（任意）"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={async () => {
                if (!token) return;
                try {
                  const res = await apiFetch<{ redirect_url: string }>(
                    `/oauth/meta/start?account_type=staff&staff_name=${encodeURIComponent(staffName)}`,
                    { token, headers: { "x-requested-with": "fetch" } },
                  );
                  window.location.href = res.redirect_url;
                } catch (e: unknown) {
                  setErr(translateError(e instanceof Error ? e.message : String(e)));
                }
              }}
            >
              スタッフ接続
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-stone-400">本番環境ではMeta社の審査が必要です</p>
      </Card>

      {/* Manual Add */}
      <Card title="手動追加（開発用）">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!validateManualForm()) return;
            if (!token) return;
            setErr(null);
            try {
              await apiFetch<InstagramAccountResponse>("/instagram/accounts", {
                method: "POST",
                token,
                body: JSON.stringify({
                  ...form,
                  staff_name: form.staff_name || null,
                }),
              });
              setForm(INITIAL_FORM);
              setFormErrors({});
              toast("success", "アカウントを追加しました");
              await load();
            } catch (e2: unknown) {
              setErr(translateError(e2 instanceof Error ? e2.message : String(e2)));
            }
          }}
        >
          <FormField label="Instagram ユーザーID" error={formErrors.ig_user_id}>
            <input className={inputClass} value={form.ig_user_id} onChange={(e) => setForm({ ...form, ig_user_id: e.target.value })} />
          </FormField>
          <FormField label="Instagram ユーザー名" error={formErrors.ig_username}>
            <input className={inputClass} value={form.ig_username} onChange={(e) => setForm({ ...form, ig_username: e.target.value })} />
          </FormField>
          <FormField label="アカウント種別">
            <select className={selectClass} value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })}>
              <option value="official">公式</option>
              <option value="staff">スタッフ</option>
            </select>
          </FormField>
          <FormField label="スタッフ名（任意）">
            <input className={inputClass} value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })} />
          </FormField>
          <FormField label="アクセストークン（長期）" className="sm:col-span-2" error={formErrors.access_token}>
            <input type="password" className={inputClass} value={form.access_token} onChange={(e) => setForm({ ...form, access_token: e.target.value })} />
          </FormField>
          <FormField label="有効日数">
            <input className={inputClass} value={form.expires_in_days} onChange={(e) => setForm({ ...form, expires_in_days: Number(e.target.value) })} type="number" min={1} max={365} />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2">
            <input type="checkbox" className={checkboxClass} checked={form.sync_hashtags} onChange={(e) => setForm({ ...form, sync_hashtags: e.target.checked })} />
            ハッシュタグ同期
          </label>
          <div className="sm:col-span-2">
            <Button variant="primary" type="submit">追加</Button>
          </div>
        </form>
      </Card>

      {/* Accounts Table */}
      <Card title="登録済みアカウント">
        {accounts.length > 0 ? (
          <div className="-mx-5 -mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">有効</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">ユーザー名</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">ユーザーID</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">種別</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">ハッシュタグ</th>
                  <th scope="col" className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {accounts.map((a) => (
                  <tr key={a.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-stone-300 text-pink-600"
                        disabled={actioningId !== null}
                        checked={a.is_active}
                        onChange={async () => {
                          if (!token) return;
                          setActioningId(`active:${a.id}`);
                          try {
                            const updated = await apiFetch<InstagramAccountResponse>(`/instagram/accounts/${a.id}`, {
                              method: "PATCH",
                              token,
                              body: JSON.stringify({ is_active: !a.is_active }),
                            });
                            setAccounts((prev) => prev.map((x) => (x.id === a.id ? updated : x)));
                          } catch (ex: unknown) {
                            setErr(translateError(ex instanceof Error ? ex.message : String(ex)));
                          } finally {
                            setActioningId(null);
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-800">{a.ig_username}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{a.ig_user_id}</td>
                    <td className="px-4 py-3">
                      <Badge variant={a.account_type === "official" ? "primary" : "default"}>{a.account_type === "official" ? "公式" : "スタッフ"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-stone-300 text-pink-600"
                        disabled={actioningId !== null}
                        checked={a.sync_hashtags}
                        onChange={async () => {
                          if (!token) return;
                          setActioningId(`hash:${a.id}`);
                          try {
                            const updated = await apiFetch<InstagramAccountResponse>(`/instagram/accounts/${a.id}`, {
                              method: "PATCH",
                              token,
                              body: JSON.stringify({ sync_hashtags: !a.sync_hashtags }),
                            });
                            setAccounts((prev) => prev.map((x) => (x.id === a.id ? updated : x)));
                          } catch (ex: unknown) {
                            setErr(translateError(ex instanceof Error ? ex.message : String(ex)));
                          } finally {
                            setActioningId(null);
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1"
                        aria-label="アカウントを削除"
                        loading={actioningId === `del:${a.id}`}
                        disabled={actioningId !== null}
                        onClick={async () => {
                          if (!token) return;
                          if (!confirm("このアカウントを削除しますか？")) return;
                          setActioningId(`del:${a.id}`);
                          try {
                            await apiFetch<void>(`/instagram/accounts/${a.id}`, { method: "DELETE", token });
                            await load();
                          } catch (ex: unknown) {
                            setErr(translateError(ex instanceof Error ? ex.message : String(ex)));
                          } finally {
                            setActioningId(null);
                          }
                        }}
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone-400">アカウントが登録されていません</p>
        )}
      </Card>
    </div>
  );
}
