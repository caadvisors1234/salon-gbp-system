import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "../DashboardPage";
import type { MeResponse, PostListItem } from "../../types/api";
import type { SetupStatus } from "../../hooks/useSetupStatus";

// Mock apiFetch
const mockApiFetch = vi.fn();
vi.mock("../../lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/api")>();
  return { ...original, apiFetch: (...args: unknown[]) => mockApiFetch(...args) };
});

// Mock useAuth
vi.mock("../../lib/auth", () => ({
  useAuth: () => ({
    session: { access_token: "test-token" },
    loading: false,
  }),
}));

const me: MeResponse = {
  id: "u1",
  supabase_user_id: "su1",
  email: "admin@salon.jp",
  role: "salon_admin",
  salon_ids: ["s1"],
  salons: [{ id: "s1", slug: "s1", name: "Salon 1", is_active: true }],
};

// Mock useMe
vi.mock("../../lib/me", () => ({
  useMe: () => ({
    me,
    loading: false,
    currentSalonId: "s1",
    setCurrentSalonId: vi.fn(),
    refetchMe: vi.fn(),
  }),
}));

// Mock useNavBadgeCounts
const mockCounts = vi.fn(() => ({ counts: {} as Record<string, number>, loading: false }));
vi.mock("../../hooks/useNavBadgeCounts", () => ({
  useNavBadgeCounts: () => mockCounts(),
}));

type SetupStatusContextValue = SetupStatus & { refetch: () => void };

function makeSetupStatus(overrides: Partial<SetupStatusContextValue> = {}): SetupStatusContextValue {
  return {
    loading: true,
    error: false,
    googleConnected: false,
    googleConnectedGlobally: false,
    googleEmail: null,
    googleExpired: false,
    locationSelected: false,
    activeLocationName: null,
    instagramConnected: false,
    instagramUsername: null,
    allComplete: false,
    currentStep: 1,
    refetch: vi.fn(),
    ...overrides,
  };
}

const mockSetupStatus = vi.fn<() => SetupStatusContextValue>(() => makeSetupStatus());

// Mock useSetupStatusContext
vi.mock("../../hooks/SetupStatusContext", () => ({
  useSetupStatusContext: () => mockSetupStatus(),
}));

// Mock toast
vi.mock("../../lib/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const posts: PostListItem[] = [
  {
    id: "p1",
    salon_id: "s1",
    gbp_location_id: "l1",
    source_content_id: "sc1",
    post_type: "STANDARD",
    status: "pending",
    summary_final: "Test post summary for the dashboard display",
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
    mockCounts.mockReturnValue({ counts: {}, loading: false });
    // Keep loading=true by default to prevent wizard/action items from
    // rendering and interfering with count assertions.
    mockSetupStatus.mockReturnValue(makeSetupStatus());
  });

  function mockApi() {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/posts")) return Promise.resolve(posts);
      if (url.includes("/me")) return Promise.resolve(me);
      return Promise.resolve(null);
    });
  }

  it("shows dashboard after data loads", async () => {
    mockApi();

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("ダッシュボード")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("admin@salon.jp（サロン管理者）")).toBeInTheDocument();
    });
  });

  it("displays post and media counts", async () => {
    mockCounts.mockReturnValue({
      counts: { "/posts/pending": 3, "/uploads/pending": 2 },
      loading: false,
    });
    mockApi();

    renderPage();
    await waitFor(() => {
      const pendingLabels = screen.getAllByText("承認待ち投稿");
      expect(pendingLabels.length).toBeGreaterThanOrEqual(1);
    });
    await waitFor(() => {
      expect(screen.getByText("メディア")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("shows error alert on fetch failure", async () => {
    mockApiFetch.mockRejectedValue(new Error("Network error"));

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("ネットワークエラーが発生しました。接続を確認してください")).toBeInTheDocument();
    });
  });

  it("displays pending posts section", async () => {
    mockApi();

    renderPage();
    await waitFor(() => {
      const cards = screen.getAllByText("承認待ち投稿");
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText("Test post summary for the dashboard display")).toBeInTheDocument();
  });

  it("hides Instagram status row in connection card", async () => {
    mockSetupStatus.mockReturnValue(makeSetupStatus({
      loading: false,
      error: false,
      googleConnected: true,
      googleConnectedGlobally: true,
      googleEmail: "admin@salon.jp",
      googleExpired: false,
      locationSelected: true,
      activeLocationName: "Salon 1",
      instagramConnected: false,
      instagramUsername: null,
      allComplete: true,
      currentStep: 2,
      refetch: vi.fn(),
    }));
    mockApi();

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("接続ステータス")).toBeInTheDocument();
    });
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.queryByText("Instagram")).not.toBeInTheDocument();
  });
});
