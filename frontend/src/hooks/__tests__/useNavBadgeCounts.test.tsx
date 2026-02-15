import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useNavBadgeCounts, NavBadgeCountsProvider } from "../useNavBadgeCounts";

const mockApiFetch = vi.fn();
vi.mock("../../lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  getCurrentSalonId: () => "s1",
  setCurrentSalonId: vi.fn(),
  SALON_CHANGED_EVENT: "salon:changed",
}));
vi.mock("../../lib/auth", () => ({
  useAuth: () => ({ session: { access_token: "test-token" }, loading: false }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(NavBadgeCountsProvider, null, children);
}

describe("useNavBadgeCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue({ pending_posts: 0, pending_media: 0, open_alerts: 0 });
  });

  it("returns counts from API response", async () => {
    mockApiFetch.mockResolvedValue({ pending_posts: 2, pending_media: 1, open_alerts: 3 });

    const { result } = renderHook(() => useNavBadgeCounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.counts).toEqual({
      "/posts/pending": 2,
      "/uploads/pending": 1,
      "/alerts": 3,
    });
  });

  it("calls single endpoint instead of multiple", async () => {
    renderHook(() => useNavBadgeCounts(), { wrapper });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/nav/counts",
      expect.objectContaining({ token: "test-token" }),
    );
  });

  it("returns empty counts when all values are zero", async () => {
    mockApiFetch.mockResolvedValue({ pending_posts: 0, pending_media: 0, open_alerts: 0 });

    const { result } = renderHook(() => useNavBadgeCounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.counts).toEqual({});
  });

  it("omits keys for zero-count items", async () => {
    mockApiFetch.mockResolvedValue({ pending_posts: 1, pending_media: 0, open_alerts: 0 });

    const { result } = renderHook(() => useNavBadgeCounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.counts).toEqual({ "/posts/pending": 1 });
    expect(result.current.counts["/uploads/pending"]).toBeUndefined();
    expect(result.current.counts["/alerts"]).toBeUndefined();
  });

  it("polls every 60 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockApiFetch.mockResolvedValue({ pending_posts: 0, pending_media: 0, open_alerts: 0 });

    renderHook(() => useNavBadgeCounts(), { wrapper });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });

    // Advance past poll interval
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  it("refetches on salon:changed event", async () => {
    mockApiFetch.mockResolvedValue({ pending_posts: 0, pending_media: 0, open_alerts: 0 });

    renderHook(() => useNavBadgeCounts(), { wrapper });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      window.dispatchEvent(new CustomEvent("salon:changed"));
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("silently handles API errors", async () => {
    mockApiFetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useNavBadgeCounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should not throw, counts remain empty
    expect(result.current.counts).toEqual({});
  });
});
