import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useApiFetch } from "../hooks/useApiFetch";
import PageHeader from "../components/PageHeader";
import DataTable, { Column } from "../components/DataTable";
import Badge, { statusVariant } from "../components/Badge";
import Alert from "../components/Alert";
import { formatDateTime } from "../lib/format";
import type { PostListItem } from "../types/api";

export default function PostsListPage({ kind }: { kind: "pending" | "history" }) {
  const navigate = useNavigate();
  const title = kind === "pending" ? "承認待ち投稿" : "投稿履歴";

  useEffect(() => {
    document.title = `${title} | サロンGBP管理`;
  }, [title]);

  const path = kind === "pending" ? "/posts?status=pending&limit=200" : "/posts?limit=200";
  const { data: rawPosts, loading, error } = useApiFetch<PostListItem[]>(
    (token, signal) => apiFetch(path, { token, signal }),
    [kind],
  );

  const posts = useMemo(() => {
    if (!rawPosts) return [];
    return kind === "pending"
      ? rawPosts
      : rawPosts.filter((p) => !["pending", "queued", "posting"].includes(p.status));
  }, [rawPosts, kind]);

  const columns: Column<PostListItem>[] = [
    {
      key: "status",
      header: "ステータス",
      render: (p) => <Badge variant={statusVariant(p.status)}>{p.status}</Badge>,
    },
    {
      key: "type",
      header: "種別",
      render: (p) => <span className="text-stone-600">{p.post_type}</span>,
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
          {p.error_message && <div className="mt-1 truncate text-xs text-red-600">{p.error_message}</div>}
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
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={title} description="クリックして編集・承認・再試行" />
      {error && <Alert variant="error" message={error} />}
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
