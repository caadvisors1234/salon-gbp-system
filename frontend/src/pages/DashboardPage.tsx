import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useApiFetch } from "../hooks/useApiFetch";
import { useMe } from "../lib/me";
import { useSetupStatusContext } from "../hooks/SetupStatusContext";
import { useNavBadgeCounts } from "../hooks/useNavBadgeCounts";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Badge, { postTypeVariant } from "../components/Badge";
import Alert from "../components/Alert";
import { SkeletonCard } from "../components/Skeleton";
import SetupWizard from "../components/SetupWizard";
import ActionItems from "../components/ActionItems";
import { IconPosts, IconMedia } from "../components/icons";
import { formatCount, formatRelative } from "../lib/format";
import { roleLabel, postTypeLabel } from "../lib/labels";
import type { PostListItem } from "../types/api";

export default function DashboardPage() {
  useEffect(() => {
    document.title = "ダッシュボード | サロンGBP管理";
  }, []);

  const { me } = useMe();
  const { counts } = useNavBadgeCounts();
  const setupStatus = useSetupStatusContext();
  const isAdmin = me?.role === "salon_admin" || me?.role === "super_admin";

  const { data: pendingPosts, loading, error } = useApiFetch<PostListItem[]>(
    (token, signal) =>
      apiFetch<PostListItem[]>("/posts?status=pending&limit=5", { token, signal }),
  );

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
        description={me ? `${me.email}（${roleLabel(me.role)}）` : undefined}
      />

      {error && <Alert variant="error" message={error} />}

      {/* Setup Wizard for admins */}
      {isAdmin && !setupStatus.loading && (
        <SetupWizard status={setupStatus} onRefetch={setupStatus.refetch} />
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-pink-50 p-2">
              <IconPosts className="h-5 w-5 text-pink-600" />
            </div>
            <div className="text-sm text-stone-500">承認待ち投稿</div>
          </div>
          <div className="mt-3 text-3xl font-bold text-stone-900">{formatCount(counts["/posts/pending"] ?? 0)}</div>
          <Link className="mt-2 inline-block text-sm font-medium text-pink-600 hover:text-pink-700" to="/posts/pending">
            投稿を確認 →
          </Link>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-50 p-2">
              <IconMedia className="h-5 w-5 text-violet-600" />
            </div>
            <div className="text-sm text-stone-500">メディア</div>
          </div>
          <div className="mt-3 text-3xl font-bold text-stone-900">{formatCount(counts["/uploads/pending"] ?? 0)}</div>
          <Link className="mt-2 inline-block text-sm font-medium text-pink-600 hover:text-pink-700" to="/uploads/pending">
            メディアを確認 →
          </Link>
        </div>

        {/* Connection Status Card */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="text-sm text-stone-500">接続ステータス</div>
          </div>
          {setupStatus.loading ? (
            <div className="mt-3 space-y-2.5">
              <div className="h-4 w-32 animate-skeleton rounded bg-stone-200" />
              <div className="h-4 w-28 animate-skeleton rounded bg-stone-200" />
            </div>
          ) : (
            <>
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${setupStatus.googleConnected ? "bg-emerald-500" : "bg-stone-300"}`} />
                  <span className="text-stone-600">Google</span>
                  <span className={`ml-auto text-xs font-medium ${setupStatus.googleConnected ? "text-emerald-600" : "text-stone-400"}`}>
                    {setupStatus.googleConnected ? "接続中" : setupStatus.googleExpired ? "期限切れ" : "未接続"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${setupStatus.instagramConnected ? "bg-emerald-500" : "bg-stone-300"}`} />
                  <span className="text-stone-600">Instagram</span>
                  <span className={`ml-auto text-xs font-medium ${setupStatus.instagramConnected ? "text-emerald-600" : "text-stone-400"}`}>
                    {setupStatus.instagramConnected ? "接続中" : "未接続"}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <Link className="mt-3 inline-block text-sm font-medium text-pink-600 hover:text-pink-700" to="/settings/gbp">
                  設定を管理 →
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action Items */}
      {!setupStatus.loading && setupStatus.allComplete && (
        <ActionItems counts={counts} setupStatus={setupStatus} />
      )}

      {(pendingPosts ?? []).length > 0 && (
        <Card
          title="承認待ち投稿"
          action={
            <Link className="text-sm font-medium text-pink-600 hover:text-pink-700" to="/posts/pending">
              すべて見る →
            </Link>
          }
        >
          <ul className="-mx-5 -mb-4 divide-y divide-stone-100">
            {(pendingPosts ?? []).slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link to={`/posts/${p.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-stone-50 transition-colors">
                  <Badge variant={postTypeVariant(p.post_type)}>{postTypeLabel(p.post_type)}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-stone-800 truncate">
                      {p.summary_final.slice(0, 80)}
                      {p.summary_final.length > 80 ? "..." : ""}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-xs text-stone-400">{formatRelative(p.created_at)}</div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
