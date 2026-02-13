import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useToast } from "../lib/toast";
import { useApiFetch } from "../hooks/useApiFetch";
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
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const title = kind === "pending" ? "承認待ち投稿" : "投稿履歴";

  useEffect(() => {
    document.title = `${title} | サロンGBP管理`;
  }, [title]);

  const path = kind === "pending"
    ? "/posts?status=pending&limit=200"
    : "/posts?exclude_status=pending,queued,posting&limit=200";
  const { data: posts, loading, error, refetch } = useApiFetch<PostListItem[]>(
    (token, signal) => apiFetch(path, { token, signal }),
    [kind],
  );

  const columns: Column<PostListItem>[] = [
    ...(kind === "pending"
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
                  disabled={actioningId !== null}
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
                  disabled={actioningId !== null}
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
