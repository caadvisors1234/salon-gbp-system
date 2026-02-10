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
import { mediaStatusLabel, mediaFormatLabel, mediaCategoryLabel, translateError } from "../lib/labels";
import type { MediaUploadListItem } from "../types/api";

export default function MediaUploadsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data: uploads, loading, error, refetch } = useApiFetch<MediaUploadListItem[]>(
    (t, s) => apiFetch("/media_uploads?status=pending&limit=200", { token: t, signal: s }),
  );

  useEffect(() => {
    document.title = "メディア | サロンGBP管理";
  }, []);

  const columns: Column<MediaUploadListItem>[] = [
    {
      key: "status",
      header: "ステータス",
      render: (u) => <Badge variant={statusVariant(u.status)}>{mediaStatusLabel(u.status)}</Badge>,
    },
    {
      key: "format",
      header: "形式",
      render: (u) => <span className="text-stone-600">{mediaFormatLabel(u.media_format)}</span>,
    },
    {
      key: "category",
      header: "カテゴリ",
      render: (u) => <span className="text-stone-600">{mediaCategoryLabel(u.category)}</span>,
    },
    {
      key: "source",
      header: "取得元URL",
      className: "max-w-[24rem]",
      render: (u) => <span className="truncate block text-xs text-stone-500">{u.source_image_url}</span>,
    },
    {
      key: "action",
      header: "",
      render: (u) => (
        <Button
          variant="primary"
          className="text-xs px-3 py-1.5"
          loading={actioningId === u.id}
          disabled={actioningId !== null}
          onClick={async (e) => {
            e.stopPropagation();
            if (!token) return;
            setActioningId(u.id);
            setErr(null);
            try {
              await apiFetch<MediaUploadListItem>(`/media_uploads/${u.id}/approve`, { method: "POST", token });
              refetch();
            } catch (ex: unknown) {
              setErr(translateError(ex instanceof Error ? ex.message : String(ex)));
            } finally {
              setActioningId(null);
            }
          }}
        >
          承認
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="メディアアップロード"
        description="承認するとGoogleビジネスプロフィールにアップロードされます"
        action={
          <Button variant="secondary" onClick={refetch}>
            <IconRefresh className="h-4 w-4" />
            再読込
          </Button>
        }
      />
      {(error || err) && <Alert variant="error" message={error || err!} />}
      <DataTable
        columns={columns}
        data={uploads ?? []}
        rowKey={(u) => u.id}
        loading={loading}
        emptyMessage="承認待ちのメディアはありません"
      />
    </div>
  );
}
