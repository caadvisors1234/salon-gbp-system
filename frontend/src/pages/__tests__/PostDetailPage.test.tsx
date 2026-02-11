import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PostDetailPage from "../PostDetailPage";
import type { PostDetail } from "../../types/api";

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
}));

const post: PostDetail = {
  id: "post-1",
  salon_id: "s1",
  gbp_location_id: "l1",
  source_content_id: "sc1",
  post_type: "STANDARD",
  status: "pending",
  summary_final: "テスト投稿の本文です",
  summary_generated: "自動生成されたテキスト",
  cta_type: null,
  cta_url: null,
  offer_redeem_online_url: null,
  event_title: null,
  event_start_date: null,
  event_end_date: null,
  gbp_post_id: null,
  image_asset_id: null,
  error_message: null,
  edited_by: null,
  edited_at: null,
  created_at: new Date().toISOString(),
  posted_at: null,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/posts/post-1"]}>
      <Routes>
        <Route path="/posts/:postId" element={<PostDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PostDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue(post);
  });

  it("displays post data after load", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("投稿詳細")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByDisplayValue("テスト投稿の本文です")).toBeInTheDocument();
    });
  });

  it("shows character count", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/現在: 10文字/)).toBeInTheDocument();
    });
  });

  it("allows editing summary text", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue("テスト投稿の本文です")).toBeInTheDocument();
    });
    const textarea = screen.getByDisplayValue("テスト投稿の本文です");
    await user.clear(textarea);
    await user.type(textarea, "新しい本文");
    expect(screen.getByDisplayValue("新しい本文")).toBeInTheDocument();
  });

  it("saves post on save button click", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(post);
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue("テスト投稿の本文です")).toBeInTheDocument();
    });

    // The second call should be the PATCH save
    mockApiFetch.mockResolvedValueOnce({ ...post, summary_final: "テスト投稿の本文です" });
    await user.click(screen.getByText("保存"));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        `/posts/post-1`,
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  it("shows validation error for invalid CTA URL", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByDisplayValue("テスト投稿の本文です")).toBeInTheDocument();
    });

    // Find CTA URL input and type invalid URL
    const ctaInputs = screen.getAllByRole("textbox");
    // CTA URL is the input after CTA type
    const ctaUrlInput = ctaInputs.find(
      (el) => el.closest("[class]") && el === ctaInputs[2],
    ) ?? ctaInputs[2];
    await user.type(ctaUrlInput, "not-a-url");

    await user.click(screen.getByText("保存"));
    await waitFor(() => {
      expect(screen.getByText("URLの形式が正しくありません")).toBeInTheDocument();
    });
  });

  it("approve button triggers POST action", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValue(post);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("承認（キュー登録）")).toBeInTheDocument();
    });

    mockApiFetch.mockResolvedValueOnce({ ...post, status: "queued" });
    await user.click(screen.getByText("承認（キュー登録）"));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/posts/post-1/approve",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("disables approve when status is not pending", async () => {
    mockApiFetch.mockResolvedValue({ ...post, status: "posted" });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("承認（キュー登録）")).toBeDisabled();
    });
  });

  it("shows auto-generated text in details section", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("自動生成テキスト（原文）")).toBeInTheDocument();
    });
  });

  describe("OFFER post type", () => {
    const offerPost: PostDetail = {
      ...post,
      post_type: "OFFER",
      event_title: "特典テスト",
      event_start_date: "2026-02-01",
      event_end_date: "2026-03-01",
      offer_redeem_online_url: "https://example.com/coupon",
    };

    it("renders event fields for OFFER post", async () => {
      mockApiFetch.mockResolvedValue(offerPost);
      renderPage();
      await waitFor(() => {
        expect(screen.getByDisplayValue("特典テスト")).toBeInTheDocument();
      });
      expect(screen.getByDisplayValue("2026-02-01")).toBeInTheDocument();
      expect(screen.getByDisplayValue("2026-03-01")).toBeInTheDocument();
    });

    it("shows validation error when event_title is empty on save", async () => {
      const user = userEvent.setup();
      mockApiFetch.mockResolvedValue({ ...offerPost, event_title: null });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("保存")).toBeInTheDocument();
      });
      await user.click(screen.getByText("保存"));
      await waitFor(() => {
        expect(screen.getByText("特典タイトルは必須です")).toBeInTheDocument();
      });
    });

    it("shows validation error when end date is before start date", async () => {
      const user = userEvent.setup();
      mockApiFetch.mockResolvedValue({
        ...offerPost,
        event_start_date: "2026-03-01",
        event_end_date: "2026-02-01",
      });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("保存")).toBeInTheDocument();
      });
      await user.click(screen.getByText("保存"));
      await waitFor(() => {
        expect(screen.getByText("終了日は開始日以降にしてください")).toBeInTheDocument();
      });
    });

    it("shows 58-char limit counter for event_title", async () => {
      mockApiFetch.mockResolvedValue(offerPost);
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/最大58文字/)).toBeInTheDocument();
      });
      expect(screen.getByText(/現在: 5文字/)).toBeInTheDocument();
    });

    it("shows validation error when event_title exceeds 58 chars", async () => {
      const user = userEvent.setup();
      const longTitle = "あ".repeat(59);
      mockApiFetch.mockResolvedValue({ ...offerPost, event_title: longTitle });
      renderPage();
      await waitFor(() => {
        expect(screen.getByText("保存")).toBeInTheDocument();
      });
      await user.click(screen.getByText("保存"));
      await waitFor(() => {
        expect(screen.getByText("特典タイトルは58文字以内で入力してください")).toBeInTheDocument();
      });
    });

    it("does not render event fields for STANDARD post", async () => {
      mockApiFetch.mockResolvedValue(post);
      renderPage();
      await waitFor(() => {
        expect(screen.getByDisplayValue("テスト投稿の本文です")).toBeInTheDocument();
      });
      expect(screen.queryByText("特典タイトル")).not.toBeInTheDocument();
      expect(screen.queryByText("開始日")).not.toBeInTheDocument();
      expect(screen.queryByText("終了日")).not.toBeInTheDocument();
    });
  });
});
