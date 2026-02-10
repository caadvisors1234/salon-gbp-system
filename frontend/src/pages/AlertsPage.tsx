import React, { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useApiFetch } from "../hooks/useApiFetch";
import PageHeader from "../components/PageHeader";
import DataTable, { Column } from "../components/DataTable";
import Badge, { severityVariant } from "../components/Badge";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { IconRefresh } from "../components/icons";
import { selectClass } from "../components/FormField";
import { formatDateTime } from "../lib/format";
import { severityLabel, alertTypeLabel, translateError } from "../lib/labels";
import type { AlertResponse } from "../types/api";

export default function AlertsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [statusFilter, setStatusFilter] = useState("open");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data: alerts, loading, error, refetch } = useApiFetch<AlertResponse[]>(
    (t, s) => apiFetch(`/alerts?status=${encodeURIComponent(statusFilter)}`, { token: t, signal: s }),
    [statusFilter],
  );

  useEffect(() => {
    document.title = "アラート | サロンGBP管理";
  }, []);

  const columns: Column<AlertResponse>[] = [
    {
      key: "severity",
      header: "重要度",
      className: "min-w-[5rem]",
      render: (a) => <Badge variant={severityVariant(a.severity)}>{severityLabel(a.severity)}</Badge>,
    },
    {
      key: "type",
      header: "種別",
      render: (a) => <span className="text-sm font-medium text-stone-800">{alertTypeLabel(a.alert_type)}</span>,
    },
    {
      key: "message",
      header: "メッセージ",
      className: "max-w-[28rem]",
      render: (a) => <span className="text-sm text-stone-600 truncate block">{translateError(a.message)}</span>,
    },
    {
      key: "created",
      header: "発生日時",
      render: (a) => <span className="text-xs text-stone-500">{formatDateTime(a.created_at)}</span>,
    },
    ...(statusFilter === "open"
      ? [{
          key: "actions" as const,
          header: "",
          render: (a: AlertResponse) => (
            <Button
              variant="secondary"
              className="text-xs px-2 py-1"
              loading={actioningId === `ack:${a.id}`}
              disabled={actioningId !== null}
              onClick={async (e: React.MouseEvent) => {
                e.stopPropagation();
                if (!token) return;
                setActioningId(`ack:${a.id}`);
                setErr(null);
                try {
                  await apiFetch(`/alerts/${a.id}/ack`, { method: "POST", token });
                  refetch();
                } catch (ex: unknown) {
                  setErr(translateError(ex instanceof Error ? ex.message : String(ex)));
                } finally {
                  setActioningId(null);
                }
              }}
            >
              確認
            </Button>
          ),
        }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="アラート"
        description="システム内部アラート一覧"
        action={
          <div className="flex items-center gap-2">
            <select
              className={selectClass + " w-auto"}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="open">未対応</option>
              <option value="acked">確認済み</option>
            </select>
            <Button variant="secondary" onClick={refetch} aria-label="再読込">
              <IconRefresh className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      {(error || err) && <Alert variant="error" message={error || err!} />}
      <DataTable
        columns={columns}
        data={alerts ?? []}
        rowKey={(a) => a.id}
        loading={loading}
        emptyMessage="アラートはありません"
      />
    </div>
  );
}
