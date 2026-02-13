import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useToast } from "../lib/toast";
import { useApiFetch } from "../hooks/useApiFetch";
import { useBulkActions } from "../hooks/useBulkActions";
import PageHeader from "../components/PageHeader";
import DataTable, { Column } from "../components/DataTable";
import Badge, { statusVariant, postTypeVariant } from "../components/Badge";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { formatDateTime } from "../lib/format";
import { statusLabel, postTypeLabel, translateError } from "../lib/labels";
import type { PostListItem } from "../types/api";

export default function PostsListPage({ kind }: { kind: "pending" | "history" }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const token = session?.access_token;
  const { toast } = useToast();
  const isPending = kind === "pending";
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const title = isPending ? "承認待ち投稿" : "投稿履歴";

  useEffect(() => {
    document.title = `${title} | サロンGBP管理`;
  }, [title]);

  const path = isPending
    ? "/posts?status=pending&limit=200"
    : "/posts?exclude_status=pending,queued,posting&limit=200";
  const { data: posts, loading, error, refetch } = useApiFetch<PostListItem[]>(
    (token, signal) => apiFetch(path, { token, signal }),
    [kind],
  );

  const bulk = useBulkActions({
    apiPrefix: "/posts",
    items: posts,
    enabled: isPending,
    refetch,
    setErr,
    labels: {
      approveSuccess: "件を投稿キューに登録しました",
      skipSuccess: "件をスキップしました",
      confirmApprove: (n) => `${n}件の投稿を投稿キューに登録します。よろしいですか？`,
      confirmSkip: (n) => `${n}件の投稿をスキップします。よろしいですか？`,
    },
  });

  const columns: Column<PostListItem>[] = [
    ...(isPending
      ? [
          {
            key: "select" as const,
            header: "選択",
            className: "w-20",
            render: (p: PostListItem) => (
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-stone-300 text-pink-600 focus:ring-pink-300"
                checked={bulk.selectedIds.has(p.id)}
                disabled={actioningId !== null || bulk.isBusy}
                aria-label={`投稿を選択 ${p.id}`}
                onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  e.stopPropagation();
                  bulk.setSelected(p.id, e.target.checked);
                }}
              />
            ),
          },
        ]
      : []),
    ...(isPending
      ? [
          {
            key: "action" as const,
            header: "",
            render: (p: PostListItem) => (
              <div className="flex gap-1">
                <Button
                  variant="primary"
                  className="text-xs px-3 py-1.5"
                  loading={actioningId === p.id}
                  disabled={actioningId !== null || bulk.isBusy}
                  onClick={async (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (!token) return;
                    setActioningId(p.id);
                    setErr(null);
                    try {
                      await apiFetch(`/posts/${p.id}/approve`, { method: "POST", token });
                      toast("success", "投稿キューに登録しました");
                      refetch();
                    } catch (ex: unknown) {
                      setErr(translateError(ex instanceof Error ? ex.message : String(ex)));
                    } finally {
                      setActioningId(null);
                    }
                  }}
                >
                  投稿
                </Button>
                <Button
                  variant="ghost"
                  className="text-xs px-3 py-1.5"
                  disabled={actioningId !== null || bulk.isBusy}
                  onClick={async (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (!token) return;
                    setActioningId(p.id);
                    setErr(null);
                    try {
                      await apiFetch(`/posts/${p.id}/skip`, { method: "POST", token });
                      toast("success", "スキップしました");
                      refetch();
                    } catch (ex: unknown) {
                      setErr(translateError(ex instanceof Error ? ex.message : String(ex)));
                    } finally {
                      setActioningId(null);
                    }
                  }}
                >
                  スキップ
                </Button>
              </div>
            ),
          },
        ]
      : []),
    ...(kind === "history"
      ? [
          {
            key: "status" as const,
            header: "ステータス",
            render: (p: PostListItem) => <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>,
          },
        ]
      : []),
    {
      key: "type",
      header: "種別",
      render: (p) => <Badge variant={postTypeVariant(p.post_type)}>{postTypeLabel(p.post_type)}</Badge>,
    },
    {
      key: "summary",
      header: "概要",
      className: "max-w-[28rem]",
      render: (p) => (
        <div>
          <div className="truncate text-stone-900">
            {p.summary_final.slice(0, 120)}
            {p.summary_final.length > 120 ? "..." : ""}
          </div>
          {p.error_message && <div className="mt-1 truncate text-xs text-red-600">{translateError(p.error_message)}</div>}
        </div>
      ),
    },
    {
      key: "created",
      header: "作成日時",
      render: (p) => <span className="text-xs text-stone-500">{formatDateTime(p.created_at)}</span>,
    },
    ...(kind === "history"
      ? [{
            key: "posted" as const,
            header: "投稿日時",
            render: (p: PostListItem) => <span className="text-xs text-stone-500">{formatDateTime(p.posted_at)}</span>,
        }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={title} description="クリックして編集・投稿・再試行" />
      {(error || err) && <Alert variant="error" message={error || err!} />}
      {isPending && (posts?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white p-3">
          <span className="text-sm text-stone-600">選択中: {bulk.selectedCount}件</span>
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            disabled={loading || bulk.isBusy || actioningId !== null}
            onClick={bulk.selectAll}
          >
            全選択
          </Button>
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            disabled={bulk.selectedCount === 0 || bulk.isBusy || actioningId !== null}
            onClick={bulk.clearSelected}
          >
            選択解除
          </Button>
          <Button
            variant="primary"
            className="px-3 py-1.5 text-xs"
            loading={bulk.bulkApproving}
            disabled={bulk.selectedCount === 0 || bulk.isBusy || actioningId !== null || !token}
            onClick={bulk.bulkApproveSelected}
          >
            選択した投稿を投稿キューへ
          </Button>
          <Button
            variant="danger"
            className="px-3 py-1.5 text-xs"
            loading={bulk.bulkSkipping}
            disabled={bulk.selectedCount === 0 || bulk.isBusy || actioningId !== null || !token}
            onClick={bulk.bulkSkipSelected}
          >
            選択した投稿をスキップ
          </Button>
        </div>
      )}
      <DataTable
        columns={columns}
        data={posts ?? []}
        rowKey={(p) => p.id}
        loading={loading}
        emptyMessage={kind === "pending" ? "承認待ちの投稿はありません" : "投稿データがありません"}
        onRowClick={(p) => navigate(`/posts/${p.id}`)}
      />
    </div>
  );
}
