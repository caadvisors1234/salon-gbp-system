import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "../DashboardPage";
import type { MeResponse, AlertResponse, PostListItem } from "../../types/api";

// Mock apiFetch
const mockApiFetch = vi.fn();
vi.mock("../../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  ApiError: class extends Error {
    status: number;
    constructor(s: number, st: string, d: string) {
      super(d);
      this.status = s;
    }
  },
}));

// Mock useAuth
vi.mock("../../lib/auth", () => ({
  useAuth: () => ({
    session: { access_token: "test-token" },
    loading: false,
  }),
}));

// Mock toast
vi.mock("../../lib/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const me: MeResponse = {
  id: "u1",
  supabase_user_id: "su1",
  email: "admin@salon.jp",
  role: "salon_admin",
  salon_id: "s1",
};

const alerts: AlertResponse[] = [
  {
    id: "a1",
    salon_id: "s1",
    severity: "high",
    alert_type: "token_expired",
    message: "GBPトークンが期限切れです",
    entity_type: null,
    entity_id: null,
    status: "open",
    acked_by: null,
    acked_at: null,
    resolved_by: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
  },
];

const posts: PostListItem[] = [
  {
    id: "p1",
    salon_id: "s1",
    gbp_location_id: "l1",
    source_content_id: "sc1",
    post_type: "STANDARD",
    status: "pending",
    summary_final: "Test post",
    cta_url: null,
    image_asset_id: null,
    error_message: null,
    created_at: new Date().toISOString(),
    posted_at: null,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows dashboard after data loads", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/me")) return Promise.resolve(me);
      if (url.includes("/alerts")) return Promise.resolve(alerts);
      if (url.includes("/posts")) return Promise.resolve(posts);
      return Promise.resolve(null);
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("ダッシュボード")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("admin@salon.jp（salon_admin）")).toBeInTheDocument();
    });
  });

  it("displays alert and post counts", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/me")) return Promise.resolve(me);
      if (url.includes("/alerts")) return Promise.resolve(alerts);
      if (url.includes("/posts")) return Promise.resolve(posts);
      return Promise.resolve(null);
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("未対応アラート")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("承認待ち投稿")).toBeInTheDocument();
    });
    // Count values rendered as text
    const countElements = screen.getAllByText("1");
    expect(countElements.length).toBeGreaterThanOrEqual(2);
  });

  it("shows error alert on fetch failure", async () => {
    mockApiFetch.mockRejectedValue(new Error("Network error"));

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("displays recent alerts section", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/me")) return Promise.resolve(me);
      if (url.includes("/alerts")) return Promise.resolve(alerts);
      if (url.includes("/posts")) return Promise.resolve(posts);
      return Promise.resolve(null);
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("最近のアラート")).toBeInTheDocument();
    });
    expect(screen.getByText("GBPトークンが期限切れです")).toBeInTheDocument();
  });
});
