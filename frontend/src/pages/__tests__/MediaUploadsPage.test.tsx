import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import MediaUploadsPage from "../MediaUploadsPage";
import { useApiFetch } from "../../hooks/useApiFetch";
import type { MediaUploadListItem } from "../../types/api";

const mockApiFetch = vi.fn();
const mockToast = vi.fn();
const mockRefetch = vi.fn();

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

const uploads: MediaUploadListItem[] = [
  {
    id: "upload-1",
    salon_id: "s1",
    gbp_location_id: "l1",
    source_content_id: "sc1",
    media_asset_id: "ma1",
    media_format: "PHOTO",
    category: "ADDITIONAL",
    status: "pending",
    source_image_url: "https://example.com/1.jpg",
    error_message: null,
    created_at: new Date().toISOString(),
    uploaded_at: null,
  },
  {
    id: "upload-2",
    salon_id: "s1",
    gbp_location_id: "l1",
    source_content_id: "sc2",
    media_asset_id: "ma2",
    media_format: "PHOTO",
    category: "ADDITIONAL",
    status: "pending",
    source_image_url: "https://example.com/2.jpg",
    error_message: null,
    created_at: new Date().toISOString(),
    uploaded_at: null,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <MediaUploadsPage kind="pending" />
    </MemoryRouter>,
  );
}

describe("MediaUploadsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useApiFetch).mockReturnValue({
      data: uploads,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
    mockApiFetch.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("bulk skips selected uploads", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText("メディアを選択 upload-1"));
    expect(screen.getByText("選択中: 1件")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "選択したメディアをスキップ" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/media_uploads/upload-1/skip",
        expect.objectContaining({ method: "POST", token: "test-token" }),
      );
    });
    expect(window.confirm).toHaveBeenCalledWith("1件のメディアをスキップします。よろしいですか？");
    expect(mockToast).toHaveBeenCalledWith("success", "1件をスキップしました");
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("bulk approves selected uploads", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText("メディアを選択 upload-1"));
    await user.click(screen.getByRole("button", { name: "選択したメディアを投稿キューへ" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/media_uploads/upload-1/approve",
        expect.objectContaining({ method: "POST", token: "test-token" }),
      );
    });
    expect(window.confirm).toHaveBeenCalledWith("1件のメディアを投稿キューに登録します。よろしいですか？");
    expect(mockToast).toHaveBeenCalledWith("success", "1件を投稿キューに登録しました");
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("continues and reports summary when partially failed", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation((path: string) => {
      if (path === "/media_uploads/upload-1/skip") {
        return Promise.reject(new Error("Upload already completed"));
      }
      return Promise.resolve({});
    });

    renderPage();
    await user.click(screen.getByLabelText("メディアを選択 upload-1"));
    await user.click(screen.getByLabelText("メディアを選択 upload-2"));
    await user.click(screen.getByRole("button", { name: "選択したメディアをスキップ" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/media_uploads/upload-1/skip",
        expect.objectContaining({ method: "POST", token: "test-token" }),
      );
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/media_uploads/upload-2/skip",
        expect.objectContaining({ method: "POST", token: "test-token" }),
      );
    });

    expect(mockToast).toHaveBeenCalledWith("warning", "1件成功 / 1件失敗");
    expect(screen.getByText("このアップロードはすでに完了しています")).toBeInTheDocument();
  });

  it("does not proceed when confirm is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText("メディアを選択 upload-1"));
    await user.click(screen.getByRole("button", { name: "選択したメディアをスキップ" }));

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
