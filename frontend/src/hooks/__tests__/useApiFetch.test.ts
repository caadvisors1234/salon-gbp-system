import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useApiFetch } from "../useApiFetch";

// Mock useAuth
const mockToken = vi.fn<() => string | null>();

vi.mock("../../lib/auth", () => ({
  useAuth: () => ({
    session: mockToken() ? { access_token: mockToken() } : null,
    loading: false,
  }),
}));

describe("useApiFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken.mockReturnValue("test-token");
  });

  it("fetches data on mount", async () => {
    const fetcher = vi.fn().mockResolvedValue({ name: "Test" });
    const { result } = renderHook(() => useApiFetch(fetcher));

    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toEqual({ name: "Test" });
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledWith("test-token", expect.any(AbortSignal));
  });

  it("sets error state on failure", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useApiFetch(fetcher));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Network error");
  });

  it("skips fetch when fetcher is null", () => {
    const { result } = renderHook(() => useApiFetch(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it("skips fetch when no token", async () => {
    mockToken.mockReturnValue(null);
    const fetcher = vi.fn().mockResolvedValue({});
    const { result } = renderHook(() => useApiFetch(fetcher));
    expect(result.current.loading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refetches when deps change", async () => {
    const fetcher = vi.fn().mockResolvedValue({ count: 1 });
    const { result, rerender } = renderHook(
      ({ dep }) => useApiFetch(fetcher, [dep]),
      { initialProps: { dep: "a" } },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    rerender({ dep: "b" });
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  it("supports manual refetch", async () => {
    const fetcher = vi.fn().mockResolvedValue({ n: 1 });
    const { result } = renderHook(() => useApiFetch(fetcher));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refetch();
    });
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  it("aborts in-flight request on refetch", async () => {
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn((_token: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    const { result } = renderHook(() => useApiFetch(fetcher));

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    expect(signals[0].aborted).toBe(true);
  });

  it("aborts active request on unmount (including after refetch)", async () => {
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn((_token: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    });
    const { result, unmount } = renderHook(() => useApiFetch(fetcher));

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    act(() => {
      unmount();
    });

    expect(signals[1].aborted).toBe(true);
  });

  it("ignores AbortError", async () => {
    const abortErr = new DOMException("Aborted", "AbortError");
    const fetcher = vi.fn().mockRejectedValue(abortErr);
    const { result } = renderHook(() => useApiFetch(fetcher));

    // Should stay in loading since AbortError is ignored
    // (actually the counter check prevents state update)
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.error).toBeNull();
  });
});
