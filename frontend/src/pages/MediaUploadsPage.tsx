import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useApiFetch } from "../hooks/useApiFetch";
import { useBulkActions } from "../hooks/useBulkActions";
import PageHeader from "../components/PageHeader";
import DataTable, { Column } from "../components/DataTable";
import Badge, { statusVariant } from "../components/Badge";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { IconRefresh } from "../components/icons";
import { useToast } from "../lib/toast";
import { mediaStatusLabel, mediaFormatLabel, translateError } from "../lib/labels";
import type { MediaUploadListItem } from "../types/api";

function MediaThumbnail({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-600 hover:underline truncate block max-w-[6rem]">
        リンク
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        src={url}
        alt=""
        className="h-12 w-12 rounded object-cover"
        onError={() => setFailed(true)}
      />
    </a>
  );
}

export default function MediaUploadsPage({ kind = "pending" }: { kind?: "pending" | "history" }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const { toast } = useToast();
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const isPending = kind === "pending";
  const apiPath = isPending
    ? "/media_uploads?status=pending&limit=200"
    : "/media_uploads?exclude_status=pending&limit=200";

  const { data: uploads, loading, error, refetch } = useApiFetch<MediaUploadListItem[]>(
    (t, s) => apiFetch(apiPath, { token: t, signal: s }),
    [kind],
  );

  const bulk = useBulkActions({
    apiPrefix: "/media_uploads",
    items: uploads,
    enabled: isPending,
    refetch,
    setErr,
    labels: {
      approveSuccess: "件を投稿キューに登録しました",
      skipSuccess: "件をスキップしました",
      confirmApprove: (n) => `${n}件のメディアを投稿キューに登録します。よろしいですか？`,
      confirmSkip: (n) => `${n}件のメディアをスキップします。よろしいですか？`,
    },
  });

  const title = isPending ? "メディアアップロード" : "メディア履歴";
  const description = isPending
    ? "承認するとGoogleビジネスプロフィールにアップロードされます"
    : "過去のメディアアップロード一覧";

  useEffect(() => {
    document.title = `${title} | サロンGBP管理`;
  }, [title]);

  const columns: Column<MediaUploadListItem>[] = [
    ...(isPending
      ? [
          {
            key: "select" as const,
            header: "選択",
            className: "w-20",
            render: (u: MediaUploadListItem) => (
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-stone-300 text-pink-600 focus:ring-pink-300"
                checked={bulk.selectedIds.has(u.id)}
                disabled={actioningId !== null || bulk.isBusy}
                aria-label={`メディアを選択 ${u.id}`}
                onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  e.stopPropagation();
                  bulk.setSelected(u.id, e.target.checked);
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
            render: (u: MediaUploadListItem) => (
              <div className="flex gap-1">
                <Button
                  variant="primary"
                  className="text-xs px-3 py-1.5"
                  loading={actioningId === u.id}
                  disabled={actioningId !== null || bulk.isBusy}
                  onClick={async (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (!token) return;
                    setActioningId(u.id);
                    setErr(null);
                    try {
                      await apiFetch<MediaUploadListItem>(`/media_uploads/${u.id}/approve`, { method: "POST", token });
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
                    setActioningId(u.id);
                    setErr(null);
                    try {
                      await apiFetch(`/media_uploads/${u.id}/skip`, { method: "POST", token });
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
    ...(!isPending
      ? [
          {
            key: "status" as const,
            header: "ステータス",
            render: (u: MediaUploadListItem) => <Badge variant={statusVariant(u.status)}>{mediaStatusLabel(u.status)}</Badge>,
          },
        ]
      : []),
    {
      key: "format",
      header: "形式",
      render: (u) => <span className="text-stone-600">{mediaFormatLabel(u.media_format)}</span>,
    },
    {
      key: "source",
      header: "画像",
      render: (u) => <MediaThumbnail url={u.source_image_url} />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={description}
        action={
          <Button variant="secondary" onClick={refetch} aria-label="再読込">
            <IconRefresh className="h-4 w-4" />
          </Button>
        }
      />
      {(error || err) && <Alert variant="error" message={error || err!} />}
      {isPending && (uploads?.length ?? 0) > 0 && (
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
            選択したメディアを投稿キューへ
          </Button>
          <Button
            variant="danger"
            className="px-3 py-1.5 text-xs"
            loading={bulk.bulkSkipping}
            disabled={bulk.selectedCount === 0 || bulk.isBusy || actioningId !== null || !token}
            onClick={bulk.bulkSkipSelected}
          >
            選択したメディアをスキップ
          </Button>
        </div>
      )}
      <DataTable
        columns={columns}
        data={uploads ?? []}
        rowKey={(u) => u.id}
        loading={loading}
        emptyMessage={isPending ? "承認待ちのメディアはありません" : "メディアデータがありません"}
      />
    </div>
  );
}
