import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminUsersPage from "../AdminUsersPage";
import type { AppUserResponse, MeResponse, SalonResponse } from "../../types/api";

const mockApiFetch = vi.fn();
const mockRefetch = vi.fn();
const mockToast = vi.fn();

const me: MeResponse = {
  id: "u-super",
  supabase_user_id: "sup-super",
  email: "owner@salon.jp",
  role: "super_admin",
  salon_ids: ["s1"],
  salons: [{ id: "s1", slug: "shibuya", name: "渋谷店", is_active: true }],
};

const users: AppUserResponse[] = [
  {
    id: "u-super",
    supabase_user_id: "sup-super",
    email: "owner@salon.jp",
    display_name: "Owner",
    role: "super_admin",
    is_active: true,
    salon_ids: ["s1"],
  },
  {
    id: "u-staff",
    supabase_user_id: "sup-staff",
    email: "staff@salon.jp",
    display_name: "Staff",
    role: "staff",
    is_active: true,
    salon_ids: ["s1"],
  },
];

const salons: SalonResponse[] = [
  {
    id: "s1",
    name: "渋谷店",
    slug: "shibuya",
    hotpepper_salon_id: "H123",
    hotpepper_blog_url: null,
    hotpepper_style_url: null,
    hotpepper_coupon_url: null,
    is_active: true,
    hotpepper_top_url: null,
  },
  {
    id: "s2",
    name: "新宿店",
    slug: "shinjuku",
    hotpepper_salon_id: "H456",
    hotpepper_blog_url: null,
    hotpepper_style_url: null,
    hotpepper_coupon_url: null,
    is_active: true,
    hotpepper_top_url: null,
  },
];

vi.mock("../../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("../../lib/auth", () => ({
  useAuth: () => ({
    session: { access_token: "test-token" },
    loading: false,
  }),
}));

vi.mock("../../lib/toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("../../hooks/useApiFetch", () => ({
  useApiFetch: () => ({
    data: [me, users, salons] as [MeResponse, AppUserResponse[], SalonResponse[]],
    loading: false,
    error: null,
    refetch: mockRefetch,
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminUsersPage />
    </MemoryRouter>,
  );
}

describe("AdminUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue({});
  });

  it("invites user with salon_ids payload", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("メールアドレス"), "new-user@salon.jp");
    const multiSelects = screen.getAllByLabelText("サロン（複数選択可）");
    await user.selectOptions(multiSelects[0], ["s1", "s2"]);
    await user.click(screen.getByRole("button", { name: "招待" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/admin/users/invite",
        expect.objectContaining({
          method: "POST",
          token: "test-token",
          body: JSON.stringify({
            email: "new-user@salon.jp",
            password: null,
            salon_ids: ["s1", "s2"],
            role: "staff",
          }),
        }),
      );
    });
  });

  it("updates existing user salon assignments", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.selectOptions(screen.getByLabelText("対象ユーザー"), "sup-staff");
    const multiSelects = screen.getAllByLabelText("サロン（複数選択可）");
    await user.deselectOptions(multiSelects[1], "s1");
    await user.selectOptions(multiSelects[1], ["s2"]);
    await user.click(screen.getByRole("button", { name: "所属サロンを更新" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/admin/users/sup-staff/salons",
        expect.objectContaining({
          method: "PUT",
          token: "test-token",
          body: JSON.stringify({ salon_ids: ["s2"] }),
        }),
      );
    });
  });
});
