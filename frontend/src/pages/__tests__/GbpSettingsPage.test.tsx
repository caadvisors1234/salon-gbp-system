import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import GbpSettingsPage from "../GbpSettingsPage";
import type { GbpConnectionResponse, GbpConnectionListItem, GbpLocationResponse } from "../../types/api";

const mockApiFetch = vi.fn();
const mockToast = vi.fn();

vi.mock("../../lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/api")>();
  return { ...original, apiFetch: (...args: unknown[]) => mockApiFetch(...args) };
});

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
  google_account_email: "salon@gmail.com",
  token_expires_at: "2026-12-31T23:59:59Z",
  status: "active",
};

const connections: GbpConnectionListItem[] = [
  {
    id: "c1",
    google_account_email: "salon@gmail.com",
    token_expires_at: "2026-12-31T23:59:59Z",
    status: "active",
    location_count: 1,
  },
];

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

/** Route mock helper — uses exact endpoint matching to avoid ordering issues. */
function routeMock(url: string, overrides?: Record<string, unknown>) {
  const defaults: Record<string, unknown> = {
    "/gbp/connections": connections,
    "/gbp/connection": conn,
    "/gbp/locations": locations,
  };
  const routes = { ...defaults, ...overrides };
  // Check most-specific paths first (longer paths before shorter ones)
  const sorted = Object.keys(routes).sort((a, b) => b.length - a.length);
  for (const path of sorted) {
    if (url.endsWith(path) || url.includes(path + "?")) {
      const val = routes[path];
      return val instanceof Error ? Promise.reject(val) : Promise.resolve(val);
    }
  }
  return Promise.resolve(null);
}

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
    mockApiFetch.mockImplementation((url: string) => routeMock(url));
  });

  it("shows OAuth success message", async () => {
    renderPage("?oauth=success");
    expect(screen.getByText("Googleアカウント連携が完了しました")).toBeInTheDocument();
  });

  it("shows OAuth error message", async () => {
    renderPage("?oauth=error");
    expect(screen.getByText("Googleアカウント連携に失敗しました")).toBeInTheDocument();
  });

  it("displays connection status", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("salon@gmail.com")).toBeInTheDocument();
    });
    expect(screen.getByText("接続中")).toBeInTheDocument();
  });

  it("displays saved locations by name", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("テストサロン渋谷店")).toBeInTheDocument();
    });
  });

  it("shows message when no connection", async () => {
    mockApiFetch.mockImplementation((url: string) =>
      routeMock(url, {
        "/gbp/connections": [],
        "/gbp/connection": new Error("Not found"),
        "/gbp/locations": [],
      }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Googleアカウントが連携されていません")).toBeInTheDocument();
    });
  });

  it("shows empty locations message", async () => {
    mockApiFetch.mockImplementation((url: string) =>
      routeMock(url, { "/gbp/locations": [] }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("店舗が登録されていません")).toBeInTheDocument();
    });
  });

  it("has connect button with context-aware label", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("別のアカウントに切り替える")).toBeInTheDocument();
    });
  });

  it("has refresh button for locations", async () => {
    renderPage();
    expect(screen.getByLabelText("再読込")).toBeInTheDocument();
  });

  it("triggers fetch available on button click", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("店舗を取得")).toBeInTheDocument();
    });

    mockApiFetch.mockResolvedValueOnce([
      { account_id: "acc-2", location_id: "locations/456", location_name: "新店舗" },
    ]);
    await user.click(screen.getByText("店舗を取得"));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/gbp/locations/available?connection_id=c1",
        expect.objectContaining({ token: "test-token" }),
      );
    });
  });

  it("updates all locations after activation toggle", async () => {
    const user = userEvent.setup();
    const locationsForToggle: GbpLocationResponse[] = [
      {
        id: "loc-1",
        salon_id: "s1",
        gbp_connection_id: "c1",
        account_id: "acc-1",
        location_id: "locations/123",
        location_name: "渋谷店",
        is_active: true,
      },
      {
        id: "loc-2",
        salon_id: "s1",
        gbp_connection_id: "c1",
        account_id: "acc-1",
        location_id: "locations/456",
        location_name: "新宿店",
        is_active: false,
      },
    ];
    mockApiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url.includes("/gbp/locations/loc-2") && opts?.method === "PATCH") {
        return Promise.resolve([
          { ...locationsForToggle[0], is_active: false },
          { ...locationsForToggle[1], is_active: true },
        ]);
      }
      return routeMock(url, { "/gbp/locations": locationsForToggle });
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText("新宿店")).toBeInTheDocument();
    });

    const savedLocationChecks = screen.getAllByRole("checkbox");
    expect(savedLocationChecks[0]).toBeChecked();
    expect(savedLocationChecks[1]).not.toBeChecked();

    await user.click(savedLocationChecks[1]);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/gbp/locations/loc-2",
        expect.objectContaining({
          method: "PATCH",
          token: "test-token",
          body: JSON.stringify({ is_active: true }),
        }),
      );
    });
    await waitFor(() => {
      expect(savedLocationChecks[0]).not.toBeChecked();
      expect(savedLocationChecks[1]).toBeChecked();
    });
  });
});
