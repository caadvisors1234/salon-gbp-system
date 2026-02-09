import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import PageHeader from "../components/PageHeader";
import DataTable, { Column } from "../components/DataTable";
import Badge, { statusVariant } from "../components/Badge";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { IconRefresh } from "../components/icons";
import { formatDateTime } from "../lib/format";

type Me = { role: string };
type JobLog = {
  id: string;
  salon_id?: string | null;
  job_type: string;
  status: string;
  items_found: number;
  items_processed: number;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
};

export default function AdminJobLogsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [me, setMe] = useState<Me | null>(null);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    document.title = "ジョブログ | サロンGBP管理";
  }, []);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [meRes, logsRes] = await Promise.all([apiFetch<Me>("/me", { token }), apiFetch<JobLog[]>("/admin/job_logs?limit=200", { token })]);
      setMe(meRes);
      setLogs(logsRes);
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

  if (me && me.role !== "super_admin") {
    return <div className="py-12 text-center text-stone-500">アクセス権限がありません</div>;
  }

  const columns: Column<JobLog>[] = [
    {
      key: "job",
      header: "ジョブ",
      render: (l) => (
        <div>
          <div className="font-medium text-stone-900">{l.job_type}</div>
          {l.error_message && <div className="mt-1 truncate text-xs text-red-600 max-w-[20rem]">{l.error_message}</div>}
        </div>
      ),
    },
    {
      key: "status",
      header: "ステータス",
      render: (l) => <Badge variant={statusVariant(l.status)}>{l.status}</Badge>,
    },
    {
      key: "found",
      header: "検出",
      render: (l) => <span className="text-stone-600">{l.items_found}</span>,
    },
    {
      key: "processed",
      header: "処理",
      render: (l) => <span className="text-stone-600">{l.items_processed}</span>,
    },
    {
      key: "started",
      header: "開始",
      render: (l) => <span className="text-xs text-stone-500">{formatDateTime(l.started_at)}</span>,
    },
    {
      key: "completed",
      header: "完了",
      render: (l) => <span className="text-xs text-stone-500">{formatDateTime(l.completed_at)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="ジョブログ"
        description="スケジュールタスクの実行履歴"
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
        data={logs}
        rowKey={(l) => l.id}
        loading={loading}
        emptyMessage="ジョブログがありません"
      />
    </div>
  );
}
