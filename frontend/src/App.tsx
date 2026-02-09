import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { apiFetch } from "./lib/api";
import Sidebar from "./components/Sidebar";
import { IconMenu, IconSpinner } from "./components/icons";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SalonSettingsPage from "./pages/SalonSettingsPage";
import GbpSettingsPage from "./pages/GbpSettingsPage";
import InstagramSettingsPage from "./pages/InstagramSettingsPage";
import PostsListPage from "./pages/PostsListPage";
import PostDetailPage from "./pages/PostDetailPage";
import MediaUploadsPage from "./pages/MediaUploadsPage";
import AlertsPage from "./pages/AlertsPage";
import AdminSalonsPage from "./pages/AdminSalonsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminMonitorPage from "./pages/AdminMonitorPage";
import AdminJobLogsPage from "./pages/AdminJobLogsPage";

type Me = {
  id: string;
  supabase_user_id: string;
  email: string;
  role: string;
  salon_id: string | null;
};

function Shell() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const token = session?.access_token;

  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }
    apiFetch<Me>("/me", { token })
      .then(setMe)
      .catch(() => setMe(null));
  }, [token]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Sidebar
        email={me?.email ?? session?.user.email ?? ""}
        role={me?.role ?? ""}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSignOut={async () => {
          await (await import("./lib/supabase")).supabase.auth.signOut();
          navigate("/login");
        }}
      />

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 md:hidden">
        <button
          className="rounded-lg p-1.5 hover:bg-stone-100"
          onClick={() => setSidebarOpen(true)}
        >
          <IconMenu className="h-5 w-5 text-stone-600" />
        </button>
        <span className="font-bold text-pink-600">Salon GBP</span>
      </div>

      {/* Main content */}
      <main className="md:ml-64">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings/salon" element={<SalonSettingsPage />} />
            <Route path="/settings/gbp" element={<GbpSettingsPage />} />
            <Route path="/settings/instagram" element={<InstagramSettingsPage />} />
            <Route path="/posts/:postId" element={<PostDetailPage />} />
            <Route path="/posts/pending" element={<PostsListPage kind="pending" />} />
            <Route path="/posts/history" element={<PostsListPage kind="history" />} />
            <Route path="/media/pending" element={<MediaUploadsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/admin/salons" element={<AdminSalonsPage />} />
            <Route path="/admin/monitor" element={<AdminMonitorPage />} />
            <Route path="/admin/job-logs" element={<AdminJobLogsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="*" element={<div className="py-12 text-center text-stone-500">ページが見つかりません</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
