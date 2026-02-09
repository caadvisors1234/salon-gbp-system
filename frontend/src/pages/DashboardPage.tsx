import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Badge, { severityVariant } from "../components/Badge";
import Alert from "../components/Alert";
import { SkeletonCard } from "../components/Skeleton";
import { IconAlert as IconAlertIcon, IconPosts, IconSettings } from "../components/icons";
import { formatRelative } from "../lib/format";

type AlertItem = { id: string; severity: string; alert_type: string; message: string; status: string; created_at: string };
type Post = { id: string; status: string; post_type: string; summary_final: string; created_at: string };
type Me = { email: string; role: string; salon_id: string | null };

export default function DashboardPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [me, setMe] = useState<Me | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    document.title = "ダッシュボード | サロンGBP管理";
  }, []);

  useEffect(() => {
    if (!token) return;
    setErr(null);
    setLoading(true);
    Promise.all([
      apiFetch<Me>("/me", { token }),
      apiFetch<AlertItem[]>("/alerts?status=open", { token }),
      apiFetch<Post[]>("/posts?status=pending&limit=50", { token })
    ])
      .then(([meRes, alertsRes, postsRes]) => {
        setMe(meRes);
        setAlerts(alertsRes);
        setPendingPosts(postsRes);
      })
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="ダッシュボード" />
        <div className="grid gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ダッシュボード"
        description={me ? `${me.email}（${me.role}）` : undefined}
      />

      {err && <Alert variant="error" message={err} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2">
              <IconAlertIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-sm text-stone-500">未対応アラート</div>
          </div>
          <div className="mt-3 text-3xl font-bold text-stone-900">{alerts.length}</div>
          <Link className="mt-2 inline-block text-sm font-medium text-pink-600 hover:text-pink-700" to="/alerts">
            アラートを確認 →
          </Link>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-pink-50 p-2">
              <IconPosts className="h-5 w-5 text-pink-600" />
            </div>
            <div className="text-sm text-stone-500">承認待ち投稿</div>
          </div>
          <div className="mt-3 text-3xl font-bold text-stone-900">{pendingPosts.length}</div>
          <Link className="mt-2 inline-block text-sm font-medium text-pink-600 hover:text-pink-700" to="/posts/pending">
            投稿を確認 →
          </Link>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-stone-100 p-2">
              <IconSettings className="h-5 w-5 text-stone-600" />
            </div>
            <div className="text-sm text-stone-500">設定</div>
          </div>
          <div className="mt-3 space-y-1.5 text-sm">
            <Link className="block font-medium text-pink-600 hover:text-pink-700" to="/settings/salon">
              マイサロン
            </Link>
            <Link className="block font-medium text-pink-600 hover:text-pink-700" to="/settings/gbp">
              GBP設定
            </Link>
            <Link className="block font-medium text-pink-600 hover:text-pink-700" to="/settings/instagram">
              Instagram設定
            </Link>
          </div>
        </div>
      </div>

      {alerts.slice(0, 5).length > 0 && (
        <Card title="最近のアラート">
          <ul className="-mx-5 -mb-4 divide-y divide-stone-100">
            {alerts.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                <Badge variant={severityVariant(a.severity)}>{a.severity.toUpperCase()}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-stone-800">{a.alert_type}</div>
                  <div className="mt-0.5 text-sm text-stone-600 truncate">{a.message}</div>
                </div>
                <div className="flex-shrink-0 text-xs text-stone-400">{formatRelative(a.created_at)}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
