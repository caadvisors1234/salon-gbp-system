import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "../Sidebar";

const mockCounts = vi.fn(() => ({ counts: {} as Record<string, number>, loading: false }));
vi.mock("../../hooks/useNavBadgeCounts", () => ({
  useNavBadgeCounts: () => mockCounts(),
}));

function renderSidebar(props: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  const defaults = {
    email: "test@example.com",
    role: "salon_admin",
    salons: [{ id: "s1", slug: "s1", name: "Salon 1", is_active: true }],
    currentSalonId: "s1",
    onSalonChange: vi.fn(),
    open: false,
    onClose: vi.fn(),
    onSignOut: vi.fn(),
  };
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Sidebar {...defaults} {...props} />
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCounts.mockReturnValue({ counts: {}, loading: false });
  });

  it("renders common nav items", () => {
    renderSidebar();
    expect(screen.getByText("ダッシュボード")).toBeInTheDocument();
    expect(screen.getByText("承認待ち投稿")).toBeInTheDocument();
    expect(screen.getByText("アラート")).toBeInTheDocument();
  });

  it("hides admin items for non-super-admin", () => {
    renderSidebar({ role: "staff" });
    expect(screen.queryByText("サロン管理")).not.toBeInTheDocument();
    expect(screen.queryByText("ユーザー管理")).not.toBeInTheDocument();
    expect(screen.queryByText("モニター")).not.toBeInTheDocument();
    expect(screen.queryByText("ジョブログ")).not.toBeInTheDocument();
  });

  it("shows admin items for super_admin", () => {
    renderSidebar({ role: "super_admin" });
    expect(screen.getByText("サロン管理")).toBeInTheDocument();
    expect(screen.getByText("ユーザー管理")).toBeInTheDocument();
    expect(screen.getByText("モニター")).toBeInTheDocument();
    expect(screen.getByText("ジョブログ")).toBeInTheDocument();
  });

  it("marks active link with aria-current", () => {
    renderSidebar();
    const dashboardLinks = screen.getAllByText("ダッシュボード");
    // Desktop + any duplicates from mobile (sidebar rendered once since open=false)
    const activeLink = dashboardLinks.find(
      (el) => el.closest("a")?.getAttribute("aria-current") === "page",
    );
    expect(activeLink).toBeTruthy();
  });

  it("displays user email", () => {
    renderSidebar({ email: "user@salon.jp" });
    expect(screen.getByText("user@salon.jp")).toBeInTheDocument();
  });

  it("calls onSignOut when logout button is clicked", async () => {
    const onSignOut = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ onSignOut });
    await user.click(screen.getByText("ログアウト"));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it("closes mobile overlay on Escape key", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ open: true, onClose });
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders mobile overlay when open", () => {
    renderSidebar({ open: true });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("ナビゲーション")).toBeInTheDocument();
  });

  it("hides settings items for staff role", () => {
    renderSidebar({ role: "staff" });
    expect(screen.queryByText("マイサロン")).not.toBeInTheDocument();
    expect(screen.queryByText("GBP設定")).not.toBeInTheDocument();
    expect(screen.queryByText("Instagram設定")).not.toBeInTheDocument();
  });

  it("shows settings items for salon_admin role", () => {
    renderSidebar({ role: "salon_admin" });
    expect(screen.getByText("マイサロン")).toBeInTheDocument();
    expect(screen.getByText("GBP設定")).toBeInTheDocument();
    expect(screen.getByText("Instagram設定")).toBeInTheDocument();
  });

  it("calls onClose when mobile close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ open: true, onClose });
    // Both desktop and mobile navs render; target the one inside the dialog
    const dialog = screen.getByRole("dialog");
    const closeBtn = dialog.querySelector("[aria-label='メニューを閉じる']") as HTMLElement;
    expect(closeBtn).toBeTruthy();
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("shows badge counts when items are pending", () => {
    mockCounts.mockReturnValue({
      counts: { "/posts/pending": 3, "/uploads/pending": 1, "/alerts": 2 },
      loading: false,
    });

    renderSidebar();

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not show badges when counts are zero", () => {
    mockCounts.mockReturnValue({ counts: {}, loading: false });

    renderSidebar();

    // No badge elements should be rendered (check by the pink badge class)
    const badges = document.querySelectorAll(".bg-pink-600");
    expect(badges).toHaveLength(0);
  });
});
