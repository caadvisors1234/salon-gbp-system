import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import PostsListPage from "../PostsListPage";
import { useApiFetch } from "../../hooks/useApiFetch";
import type { PostListItem } from "../../types/api";

const mockApiFetch = vi.fn();
const mockToast = vi.fn();
const mockRefetch = vi.fn();
const mockNavigate = vi.fn();

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
  useApiFetch: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const posts: PostListItem[] = [
  {
    id: "post-1",
    salon_id: "s1",
    gbp_location_id: "l1",
    source_content_id: "sc1",
    post_type: "STANDARD",
    status: "pending",
    summary_final: "投稿1",
    cta_url: null,
    image_asset_id: null,
    error_message: null,
    created_at: new Date().toISOString(),
    posted_at: null,
  },
  {
    id: "post-2",
    salon_id: "s1",
    gbp_location_id: "l1",
    source_content_id: "sc2",
    post_type: "STANDARD",
    status: "pending",
    summary_final: "投稿2",
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
      <PostsListPage kind="pending" />
    </MemoryRouter>,
  );
}

describe("PostsListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useApiFetch).mockReturnValue({
      data: posts,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockApiFetch.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("bulk skips selected posts", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText("投稿を選択 post-1"));
    expect(screen.getByText("選択中: 1件")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "選択した投稿をスキップ" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/posts/post-1/skip",
        expect.objectContaining({ method: "POST", token: "test-token" }),
      );
    });
    expect(window.confirm).toHaveBeenCalledWith("1件の投稿をスキップします。よろしいですか？");
    expect(mockToast).toHaveBeenCalledWith("success", "1件をスキップしました");
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("bulk approves selected posts", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText("投稿を選択 post-1"));
    await user.click(screen.getByRole("button", { name: "選択した投稿を投稿キューへ" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/posts/post-1/approve",
        expect.objectContaining({ method: "POST", token: "test-token" }),
      );
    });
    expect(window.confirm).toHaveBeenCalledWith("1件の投稿を投稿キューに登録します。よろしいですか？");
    expect(mockToast).toHaveBeenCalledWith("success", "1件を投稿キューに登録しました");
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("continues and reports summary when partially failed", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((path: string) => {
      if (path === "/posts/post-1/skip") {
        return Promise.reject(new Error("Post already posted"));
      }
      return Promise.resolve({});
    });

    renderPage();
    await user.click(screen.getByLabelText("投稿を選択 post-1"));
    await user.click(screen.getByLabelText("投稿を選択 post-2"));
    await user.click(screen.getByRole("button", { name: "選択した投稿をスキップ" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/posts/post-1/skip",
        expect.objectContaining({ method: "POST", token: "test-token" }),
      );
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/posts/post-2/skip",
        expect.objectContaining({ method: "POST", token: "test-token" }),
      );
    });

    expect(mockToast).toHaveBeenCalledWith("warning", "1件成功 / 1件失敗");
    expect(screen.getByText("この投稿はすでに投稿済みです")).toBeInTheDocument();
  });

  it("does not navigate when checkbox is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText("投稿を選択 post-1"));

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("does not proceed when confirm is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText("投稿を選択 post-1"));
    await user.click(screen.getByRole("button", { name: "選択した投稿をスキップ" }));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("selects all and clears selection", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "全選択" }));
    expect(screen.getByText("選択中: 2件")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "選択解除" }));
    expect(screen.getByText("選択中: 0件")).toBeInTheDocument();
  });
});
