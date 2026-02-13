import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useApiFetch } from "../hooks/useApiFetch";
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
            key: "action" as const,
            header: "",
            render: (u: MediaUploadListItem) => (
              <div className="flex gap-1">
                <Button
                  variant="primary"
                  className="text-xs px-3 py-1.5"
                  loading={actioningId === u.id}
                  disabled={actioningId !== null}
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
                  disabled={actioningId !== null}
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
