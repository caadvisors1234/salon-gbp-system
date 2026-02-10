import React, { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { ToastProvider, useToast } from "./lib/toast";
import { apiFetch } from "./lib/api";
import Sidebar from "./components/Sidebar";
import ErrorBoundary from "./components/ErrorBoundary";
import { IconMenu, IconSpinner } from "./components/icons";
import { translateError } from "./lib/labels";
import type { MeResponse } from "./types/api";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SalonSettingsPage = lazy(() => import("./pages/SalonSettingsPage"));
const GbpSettingsPage = lazy(() => import("./pages/GbpSettingsPage"));
const InstagramSettingsPage = lazy(() => import("./pages/InstagramSettingsPage"));
const PostsListPage = lazy(() => import("./pages/PostsListPage"));
const PostDetailPage = lazy(() => import("./pages/PostDetailPage"));
const MediaUploadsPage = lazy(() => import("./pages/MediaUploadsPage"));
const AlertsPage = lazy(() => import("./pages/AlertsPage"));
const AdminSalonsPage = lazy(() => import("./pages/AdminSalonsPage"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminMonitorPage = lazy(() => import("./pages/AdminMonitorPage"));
const AdminJobLogsPage = lazy(() => import("./pages/AdminJobLogsPage"));

export function RequireSalonAdmin({ role, children }: { role: string; children: React.ReactNode }) {
  if (!role) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconSpinner className="h-6 w-6 text-pink-500" />
      </div>
    );
  }
  if (role !== "salon_admin" && role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function Shell() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const token = session?.access_token;

  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }
    const ac = new AbortController();
    apiFetch<MeResponse>("/me", { token, signal: ac.signal })
      .then(setMe)
      .catch((e) => {
        if (e.name === "AbortError") return;
        setMe(null);
      });
    return () => ac.abort();
  }, [token]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Global unhandled rejection handler
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      toast("error", translateError(e.reason?.message ?? "予期しないエラーが発生しました"));
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, [toast]);

  const isLogin = location.pathname === "/login";

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <IconSpinner className="h-8 w-8 text-pink-500" />
          <span className="text-sm text-stone-500">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (!session && !isLogin) return <Navigate to="/login" replace />;

  if (isLogin) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <IconSpinner className="h-6 w-6 text-pink-500" />
        </div>
      }>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-pink-600 focus:shadow-lg focus:rounded-lg"
      >
        メインコンテンツへスキップ
      </a>

      <Sidebar
        email={me?.email ?? session?.user.email ?? ""}
        role={me?.role ?? ""}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={async () => {
          const { supabase } = await import("./lib/supabase");
          if (supabase) {
            await supabase.auth.signOut();
          }
          navigate("/login");
        }}
      />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 md:hidden">
        <button
          className="rounded-lg p-1.5 hover:bg-stone-100"
          aria-label="メニューを開く"
          onClick={() => setSidebarOpen(true)}
        >
          <IconMenu className="h-5 w-5 text-stone-600" />
        </button>
        <span className="font-bold text-pink-600">Salon GBP</span>
      </div>

      {/* Main content */}
      <main id="main-content" className="md:ml-64">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
          <ErrorBoundary resetKeys={[location.pathname]}>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <IconSpinner className="h-6 w-6 text-pink-500" />
              </div>
            }>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/settings/salon" element={<RequireSalonAdmin role={me?.role ?? ""}><SalonSettingsPage /></RequireSalonAdmin>} />
                <Route path="/settings/gbp" element={<RequireSalonAdmin role={me?.role ?? ""}><GbpSettingsPage /></RequireSalonAdmin>} />
                <Route path="/settings/instagram" element={<RequireSalonAdmin role={me?.role ?? ""}><InstagramSettingsPage /></RequireSalonAdmin>} />
                <Route path="/posts/:postId" element={<PostDetailPage />} />
                <Route path="/posts/pending" element={<PostsListPage kind="pending" />} />
                <Route path="/posts/history" element={<PostsListPage kind="history" />} />
                <Route path="/uploads/pending" element={<MediaUploadsPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/admin/salons" element={<AdminSalonsPage />} />
                <Route path="/admin/monitor" element={<AdminMonitorPage />} />
                <Route path="/admin/job-logs" element={<AdminJobLogsPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="*" element={<div className="py-12 text-center text-stone-500">ページが見つかりません</div>} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
