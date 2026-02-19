import React from "react";
import { Link } from "react-router-dom";
import { IconChevronRight, IconCheck } from "./icons";
import type { SetupStatus } from "../hooks/useSetupStatus";

interface ActionItemsProps {
  counts: Record<string, number>;
  setupStatus: SetupStatus;
  role?: string;
}

interface ActionItem {
  label: string;
  count?: number;
  to: string;
  variant: "pink" | "violet" | "amber" | "red";
}

export default function ActionItems({ counts, setupStatus, role }: ActionItemsProps) {
  const items: ActionItem[] = [];

  if (setupStatus.googleExpired && role) {
    items.push({
      label: role === "super_admin"
        ? "Googleアカウントの再連携が必要です"
        : "Googleアカウントの再連携が必要です（管理者に連絡してください）",
      to: role === "super_admin" ? "/settings/gbp" : "/alerts",
      variant: "red",
    });
  }

  const pendingPosts = counts["/posts/pending"] ?? 0;
  if (pendingPosts > 0) {
    items.push({
      label: "承認待ち投稿",
      count: pendingPosts,
      to: "/posts/pending",
      variant: "pink",
    });
  }

  const pendingMedia = counts["/uploads/pending"] ?? 0;
  if (pendingMedia > 0) {
    items.push({
      label: "承認待ちメディア",
      count: pendingMedia,
      to: "/uploads/pending",
      variant: "violet",
    });
  }

  const openAlerts = counts["/alerts"] ?? 0;
  if (openAlerts > 0) {
    items.push({
      label: "未対応アラート",
      count: openAlerts,
      to: "/alerts",
      variant: "amber",
    });
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
          <IconCheck className="h-4 w-4" />
        </span>
        <div>
          <div className="font-medium text-emerald-800">すべて完了！</div>
          <div className="text-sm text-emerald-600">現在対応が必要なタスクはありません。</div>
        </div>
      </div>
    );
  }

  const variantStyles = {
    pink: "bg-pink-50 text-pink-700 border-pink-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  const badgeStyles = {
    pink: "bg-pink-500",
    violet: "bg-violet-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-5 py-3">
        <h3 className="text-sm font-bold text-stone-700">今やるべきこと</h3>
      </div>
      <ul className="divide-y divide-stone-100">
        {items.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50 transition-colors"
            >
              <span className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${variantStyles[item.variant]}`}>
                {item.label}
              </span>
              {item.count !== undefined && (
                <span className={`flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-bold text-white ${badgeStyles[item.variant]}`}>
                  {item.count}
                </span>
              )}
              <IconChevronRight className="ml-auto h-4 w-4 text-stone-400" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
