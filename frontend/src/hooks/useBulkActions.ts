import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { apiFetch } from "../lib/api";
import { translateError } from "../lib/labels";

const CONCURRENCY = 5;

async function runBatched(
  ids: string[],
  buildUrl: (id: string) => string,
  token: string,
): Promise<PromiseSettledResult<unknown>[]> {
  const results: PromiseSettledResult<unknown>[] = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map((id) => apiFetch(buildUrl(id), { method: "POST", token })),
    );
    results.push(...batchResults);
  }
  return results;
}

interface BulkActionsOptions {
  /** e.g. "/posts" or "/media_uploads" */
  apiPrefix: string;
  /** Items currently loaded (used for selectAll and stale-id cleanup) */
  items: { id: string }[] | null;
  /** Whether bulk actions are enabled (typically isPending) */
  enabled: boolean;
  /** Called after a bulk action completes */
  refetch: () => void;
  /** Callback to set error message on the page */
  setErr: (msg: string | null) => void;
  /** Labels */
  labels: {
    approveSuccess: string;
    skipSuccess: string;
    confirmApprove: (count: number) => string;
    confirmSkip: (count: number) => string;
  };
}

export interface BulkActions {
  selectedIds: Set<string>;
  selectedCount: number;
  bulkApproving: boolean;
  bulkSkipping: boolean;
  isBusy: boolean;
  setSelected: (id: string, checked: boolean) => void;
  selectAll: () => void;
  clearSelected: () => void;
  bulkApproveSelected: () => Promise<void>;
  bulkSkipSelected: () => Promise<void>;
}

export function useBulkActions({
  apiPrefix,
  items,
  enabled,
  refetch,
  setErr,
  labels,
}: BulkActionsOptions): BulkActions {
  const { session } = useAuth();
  const token = session?.access_token;
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [bulkSkipping, setBulkSkipping] = useState(false);

  // Clean up stale IDs when items change
  useEffect(() => {
    if (!enabled) return;
    const currentIds = new Set((items ?? []).map((item) => item.id));
    setSelectedIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (currentIds.has(id)) next.add(id);
      }
      return next;
    });
  }, [enabled, items]);

  const selectedCount = selectedIds.size;

  const setSelected = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set((items ?? []).map((item) => item.id)));
  }, [items]);

  const clearSelected = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const bulkApproveSelected = useCallback(async () => {
    if (!token || selectedCount === 0) return;
    if (!window.confirm(labels.confirmApprove(selectedCount))) return;
    const targetIds = Array.from(selectedIds);
    setBulkApproving(true);
    setErr(null);
    try {
      const results = await runBatched(
        targetIds,
        (id) => `${apiPrefix}/${id}/approve`,
        token,
      );
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failedResults = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );
      const failedCount = failedResults.length;

      if (failedCount === 0) {
        toast("success", `${successCount}${labels.approveSuccess}`);
      } else {
        const firstError = failedResults[0]?.reason;
        const message = translateError(
          firstError instanceof Error ? firstError.message : String(firstError),
        );
        setErr(message);
        toast("warning", `${successCount}件成功 / ${failedCount}件失敗`);
      }
      setSelectedIds(new Set());
      refetch();
    } finally {
      setBulkApproving(false);
    }
  }, [token, selectedCount, selectedIds, apiPrefix, labels, setErr, refetch, toast]);

  const bulkSkipSelected = useCallback(async () => {
    if (!token || selectedCount === 0) return;
    if (!window.confirm(labels.confirmSkip(selectedCount))) return;
    const targetIds = Array.from(selectedIds);
    setBulkSkipping(true);
    setErr(null);
    try {
      const results = await runBatched(
        targetIds,
        (id) => `${apiPrefix}/${id}/skip`,
        token,
      );
      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failedResults = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      );
      const failedCount = failedResults.length;

      if (failedCount === 0) {
        toast("success", `${successCount}${labels.skipSuccess}`);
      } else {
        const firstError = failedResults[0]?.reason;
        const message = translateError(
          firstError instanceof Error ? firstError.message : String(firstError),
        );
        setErr(message);
        toast("warning", `${successCount}件成功 / ${failedCount}件失敗`);
      }
      setSelectedIds(new Set());
      refetch();
    } finally {
      setBulkSkipping(false);
    }
  }, [token, selectedCount, selectedIds, apiPrefix, labels, setErr, refetch, toast]);

  const isBusy = bulkApproving || bulkSkipping;

  return {
    selectedIds,
    selectedCount,
    bulkApproving,
    bulkSkipping,
    isBusy,
    setSelected,
    selectAll,
    clearSelected,
    bulkApproveSelected,
    bulkSkipSelected,
  };
}
