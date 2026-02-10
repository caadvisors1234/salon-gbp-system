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
  const [approvingId, setApprovingId] = useState<string | null>(null);
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
    {
      key: "status",
      header: "ステータス",
      render: (p) => <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>,
    },
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
    {
      key: "posted",
      header: "投稿日時",
      render: (p) => <span className="text-xs text-stone-500">{formatDateTime(p.posted_at)}</span>,
    },
    ...(kind === "pending"
      ? [
          {
            key: "approve" as const,
            header: "",
            render: (p: PostListItem) => (
              <Button
                variant="primary"
                className="text-xs px-3 py-1.5"
                loading={approvingId === p.id}
                disabled={approvingId !== null}
                onClick={async (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (!token) return;
                  setApprovingId(p.id);
                  setErr(null);
                  try {
                    await apiFetch(`/posts/${p.id}/approve`, { method: "POST", token });
                    toast("success", "承認しました");
                    refetch();
                  } catch (ex: unknown) {
                    setErr(translateError(ex instanceof Error ? ex.message : String(ex)));
                  } finally {
                    setApprovingId(null);
                  }
                }}
              >
                承認
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={title} description="クリックして編集・承認・再試行" />
      {(error || err) && <Alert variant="error" message={error || err!} />}
      <DataTable
        columns={columns}
        data={posts}
        rowKey={(p) => p.id}
        loading={loading}
        emptyMessage={kind === "pending" ? "承認待ちの投稿はありません" : "投稿データがありません"}
        onRowClick={(p) => navigate(`/posts/${p.id}`)}
      />
    </div>
  );
}
