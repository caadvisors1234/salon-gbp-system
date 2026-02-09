import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import PageHeader from "../components/PageHeader";
import DataTable, { Column } from "../components/DataTable";
import Badge, { statusVariant } from "../components/Badge";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { IconRefresh } from "../components/icons";

type Upload = {
  id: string;
  status: string;
  media_format: string;
  category: string;
  source_image_url: string;
  created_at: string;
  error_message?: string | null;
};

export default function MediaUploadsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    document.title = "メディア | サロンGBP管理";
  }, []);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch<Upload[]>("/media_uploads?status=pending&limit=200", { token });
      setUploads(res);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const columns: Column<Upload>[] = [
    {
      key: "status",
      header: "ステータス",
      render: (u) => <Badge variant={statusVariant(u.status)}>{u.status}</Badge>,
    },
    {
      key: "format",
      header: "形式",
      render: (u) => <span className="text-stone-600">{u.media_format}</span>,
    },
    {
      key: "category",
      header: "カテゴリ",
      render: (u) => <span className="text-stone-600">{u.category}</span>,
    },
    {
      key: "source",
      header: "ソースURL",
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
          onClick={async (e) => {
            e.stopPropagation();
            if (!token) return;
            await apiFetch<Upload>(`/media_uploads/${u.id}/approve`, { method: "POST", token });
            await load();
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
        description="承認するとGBP Media APIへアップロードされます"
        action={
          <Button variant="secondary" onClick={() => load()}>
            <IconRefresh className="h-4 w-4" />
            再読込
          </Button>
        }
      />
      {err && <Alert variant="error" message={err} />}
      <DataTable
        columns={columns}
        data={uploads}
        rowKey={(u) => u.id}
        loading={loading}
        emptyMessage="承認待ちのメディアはありません"
      />
    </div>
  );
}
