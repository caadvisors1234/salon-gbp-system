import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import type { MeSalonMembership } from "../types/api";
import { useNavBadgeCounts } from "../hooks/useNavBadgeCounts";
import { formatCount } from "../lib/format";
import {
  IconDashboard,
  IconPosts,
  IconHistory,
  IconMedia,
  IconAlert,
  IconSettings,
  IconGbp,
  IconInstagram,
  IconStore,
  IconUsers,
  IconMonitor,
  IconLogs,
  IconLogout,
  IconX,
} from "./icons";

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  requireSalonAdmin?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const iconCls = "h-5 w-5";

const sections: NavSection[] = [
  {
    title: "メイン",
    items: [
      { label: "ダッシュボード", to: "/dashboard", icon: <IconDashboard className={iconCls} /> },
    ],
  },
  {
    title: "コンテンツ",
    items: [
      { label: "承認待ち投稿", to: "/posts/pending", icon: <IconPosts className={iconCls} /> },
      { label: "投稿履歴", to: "/posts/history", icon: <IconHistory className={iconCls} /> },
      { label: "メディア", to: "/uploads/pending", icon: <IconMedia className={iconCls} /> },
      { label: "メディア履歴", to: "/uploads/history", icon: <IconHistory className={iconCls} /> },
    ],
  },
  {
    title: "通知",
    items: [
      { label: "アラート", to: "/alerts", icon: <IconAlert className={iconCls} /> },
    ],
  },
  {
    title: "設定",
    items: [
      { label: "マイサロン", to: "/settings/salon", icon: <IconSettings className={iconCls} />, requireSalonAdmin: true },
      { label: "GBP設定", to: "/settings/gbp", icon: <IconGbp className={iconCls} />, requireSalonAdmin: true },
      { label: "Instagram設定", to: "/settings/instagram", icon: <IconInstagram className={iconCls} />, requireSalonAdmin: true },
    ],
  },
  {
    title: "管理者",
    items: [
      { label: "サロン管理", to: "/admin/salons", icon: <IconStore className={iconCls} />, adminOnly: true },
      { label: "ユーザー管理", to: "/admin/users", icon: <IconUsers className={iconCls} />, adminOnly: true },
      { label: "モニター", to: "/admin/monitor", icon: <IconMonitor className={iconCls} />, adminOnly: true },
      { label: "ジョブログ", to: "/admin/job-logs", icon: <IconLogs className={iconCls} />, adminOnly: true },
    ],
  },
];

export default function Sidebar({
  email,
  role,
  salons,
  currentSalonId,
  onSalonChange,
  open,
  onClose,
  onSignOut,
}: {
  email: string;
  role: string;
  salons: MeSalonMembership[];
  currentSalonId: string | null;
  onSalonChange: (salonId: string | null) => void;
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const location = useLocation();
  const { counts: badgeCounts } = useNavBadgeCounts();
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "super_admin" || role === "salon_admin";
  const sidebarRef = useRef<HTMLElement>(null);
  const selectedSalonId = currentSalonId ?? salons[0]?.id ?? "";

  const isActive = (to: string) => {
    if (to === "/dashboard") return location.pathname === "/dashboard" || location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  // Escape key closes mobile overlay
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Focus management for mobile overlay
  useEffect(() => {
    if (open && sidebarRef.current) {
      sidebarRef.current.focus();
    }
  }, [open]);

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <Link to="/dashboard" className="flex items-center gap-2 text-lg font-bold text-pink-600" onClick={onClose}>
          <img src="/favicon-32x32.png" alt="" width={24} height={24} className="shrink-0" />
          Salon GBP
        </Link>
        <button className="md:hidden rounded-lg p-1 hover:bg-stone-100" aria-label="メニューを閉じる" onClick={onClose}>
          <IconX className="h-5 w-5 text-stone-500" />
        </button>
      </div>

      {salons.length > 0 && (
        <div className="border-b border-stone-100 px-4 py-3">
          <label htmlFor="salon-switcher" className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-stone-400">
            操作サロン
          </label>
          <select
            id="salon-switcher"
            className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-700 focus:border-pink-300 focus:outline-none focus:ring-1 focus:ring-pink-300"
            value={selectedSalonId}
            onChange={(e) => onSalonChange(e.target.value || null)}
          >
            {salons.map((salon) => (
              <option key={salon.id} value={salon.id}>
                {salon.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((section) => {
          const visibleItems = section.items.filter((item) => (!item.adminOnly || isSuperAdmin) && (!item.requireSalonAdmin || isAdmin));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title}>
              <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-pink-50 text-pink-700"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                    >
                      <span className={active ? "text-pink-600" : "text-stone-400"}>
                        {item.icon}
                      </span>
                      {item.label}
                      {badgeCounts[item.to] ? (
                        <span className="ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-pink-600 px-1.5 text-[11px] font-semibold leading-none text-white">
                          {formatCount(badgeCounts[item.to])}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-stone-100 px-4 py-3">
        <div className="mb-2 truncate text-xs text-stone-500" title={email}>
          {email}
        </div>
        <button
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
          onClick={onSignOut}
        >
          <IconLogout className="h-4 w-4" />
          ログアウト
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-shrink-0 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-stone-200">
        {nav}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
          <aside
            ref={sidebarRef}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl animate-slide-in"
            role="dialog"
            aria-label="ナビゲーション"
            tabIndex={-1}
          >
            {nav}
          </aside>
        </>
      )}
    </>
  );
}
