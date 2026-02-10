import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import GbpSettingsPage from "../GbpSettingsPage";
import type { GbpConnectionResponse, GbpLocationResponse } from "../../types/api";

const mockApiFetch = vi.fn();
const mockToast = vi.fn();

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

vi.mock("../../lib/auth", () => ({
  useAuth: () => ({
    session: { access_token: "test-token" },
    loading: false,
  }),
}));

vi.mock("../../lib/toast", () => ({
  useToast: () => ({ toast: mockToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const conn: GbpConnectionResponse = {
  id: "c1",
  salon_id: "s1",
  google_account_email: "salon@gmail.com",
  token_expires_at: "2026-12-31T23:59:59Z",
  status: "active",
};

const locations: GbpLocationResponse[] = [
  {
    id: "loc-1",
    salon_id: "s1",
    gbp_connection_id: "c1",
    account_id: "acc-1",
    location_id: "locations/123",
    location_name: "テストサロン渋谷店",
    is_active: true,
  },
];

function renderPage(search = "") {
  return render(
    <MemoryRouter initialEntries={[`/settings/gbp${search}`]}>
      <GbpSettingsPage />
    </MemoryRouter>,
  );
}

describe("GbpSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/gbp/connection")) return Promise.resolve(conn);
      if (url.includes("/gbp/locations")) return Promise.resolve(locations);
      return Promise.resolve(null);
    });
  });

  it("shows OAuth success message", async () => {
    renderPage("?oauth=success");
    expect(screen.getByText("OAuth接続が完了しました")).toBeInTheDocument();
  });

  it("shows OAuth error message", async () => {
    renderPage("?oauth=error");
    expect(screen.getByText("OAuth接続に失敗しました")).toBeInTheDocument();
  });

  it("displays connection status", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("salon@gmail.com")).toBeInTheDocument();
    });
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("displays saved locations", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("テストサロン渋谷店")).toBeInTheDocument();
    });
    expect(screen.getByText("locations/123")).toBeInTheDocument();
  });

  it("shows '未接続' when no connection", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/gbp/connection")) return Promise.reject(new Error("Not found"));
      if (url.includes("/gbp/locations")) return Promise.resolve([]);
      return Promise.resolve(null);
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("未接続")).toBeInTheDocument();
    });
  });

  it("shows empty locations message", async () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes("/gbp/connection")) return Promise.resolve(conn);
      if (url.includes("/gbp/locations")) return Promise.resolve([]);
      return Promise.resolve(null);
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("ロケーションが登録されていません")).toBeInTheDocument();
    });
  });

  it("has connect/reconnect button", async () => {
    renderPage();
    expect(screen.getByText("接続 / 再接続")).toBeInTheDocument();
  });

  it("has refresh button for locations", async () => {
    renderPage();
    expect(screen.getByText("再読込")).toBeInTheDocument();
  });

  it("triggers fetch available on button click", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("取得")).toBeInTheDocument();
    });

    mockApiFetch.mockResolvedValueOnce([
      { account_id: "acc-2", location_id: "locations/456", location_name: "新店舗" },
    ]);
    await user.click(screen.getByText("取得"));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/gbp/locations/available",
        expect.objectContaining({ token: "test-token" }),
      );
    });
  });
});
