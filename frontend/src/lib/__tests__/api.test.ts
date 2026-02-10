import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, ApiError } from "../api";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("sets Accept and Authorization headers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1 }),
    });
    await apiFetch("/test", { token: "tok123" });
    const [, opts] = mockFetch.mock.calls[0];
    const headers = opts.headers as Headers;
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer tok123");
  });

  it("sets Content-Type when body is present", async () => {
    // Use a capturing spy instead of plain mock to inspect Headers
    let capturedHeaders: Headers | null = null;
    mockFetch.mockImplementationOnce((_url: string, init: RequestInit) => {
      capturedHeaders = init.headers as Headers;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });
    await apiFetch("/test", { token: "tok", body: JSON.stringify({ a: 1 }) });
    expect(capturedHeaders).not.toBeNull();
    expect(capturedHeaders!.get("content-type")).toBe("application/json");
  });

  it("parses JSON response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ name: "Test" }),
    });
    const result = await apiFetch<{ name: string }>("/test");
    expect(result.name).toBe("Test");
  });

  it("returns undefined for 204 responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });
    const result = await apiFetch("/test");
    expect(result).toBeUndefined();
  });

  it("throws ApiError on non-ok responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: () => Promise.resolve(JSON.stringify({ detail: "Invalid input" })),
    });
    await expect(apiFetch("/test")).rejects.toThrow(ApiError);
    try {
      await apiFetch("/test");
    } catch (e) {
      // already thrown above
    }
  });

  it("extracts detail from FastAPI error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      text: () => Promise.resolve(JSON.stringify({ detail: "バリデーションエラー" })),
    });
    try {
      await apiFetch("/test");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).detail).toBe("バリデーションエラー");
      expect((e as ApiError).status).toBe(422);
    }
  });

  it("dispatches auth:expired event on 401", async () => {
    const handler = vi.fn();
    window.addEventListener("auth:expired", handler);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: () => Promise.resolve(JSON.stringify({ detail: "Token expired" })),
    });
    try {
      await apiFetch("/test");
    } catch {
      // expected
    }
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("auth:expired", handler);
  });
});
