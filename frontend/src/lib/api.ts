export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";
export const CURRENT_SALON_ID_STORAGE_KEY = "current_salon_id";
export const SALON_CHANGED_EVENT = "salon:changed";

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public detail: string,
  ) {
    super(detail || `${status} ${statusText}`);
    this.name = "ApiError";
  }
}

function stringifyUnknown(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatFastApiValidationDetail(detail: unknown): string | null {
  if (!Array.isArray(detail)) return null;
  const parts = detail
    .map((item) => {
      if (item && typeof item === "object") {
        const anyItem = item as any;
        const msg = typeof anyItem.msg === "string" ? anyItem.msg : null;
        const loc =
          Array.isArray(anyItem.loc) && anyItem.loc.length > 0
            ? anyItem.loc.map((v: unknown) => String(v)).join(".")
            : null;
        if (msg && loc) return `${loc}: ${msg}`;
        if (msg) return msg;
      }
      return stringifyUnknown(item);
    })
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join("; ");
}

function extractErrorDetail(rawBody: string): string {
  const raw = rawBody.trim();
  if (!raw) return "";
  try {
    const json = JSON.parse(raw);
    if (json && typeof json === "object") {
      const detail = (json as any).detail;
      const formatted = formatFastApiValidationDetail(detail);
      if (formatted) return formatted;
      if (typeof detail === "string") return detail;
      if (typeof (json as any).message === "string") return (json as any).message;
      return stringifyUnknown(detail ?? json);
    }
    return stringifyUnknown(json);
  } catch {
    return raw;
  }
}

function getSafeStorage(): Partial<Storage> | null {
  if (typeof window === "undefined") return null;
  try {
    return (window.localStorage as Partial<Storage> | undefined) ?? null;
  } catch {
    return null;
  }
}

export function getCurrentSalonId(): string | null {
  const storage = getSafeStorage();
  if (!storage || typeof storage.getItem !== "function") return null;
  let raw = "";
  try {
    raw = storage.getItem(CURRENT_SALON_ID_STORAGE_KEY) ?? "";
  } catch {
    return null;
  }
  const value = raw?.trim() ?? "";
  return value.length > 0 ? value : null;
}

export function setCurrentSalonId(salonId: string | null): void {
  const storage = getSafeStorage();
  if (!storage || typeof storage.setItem !== "function" || typeof storage.removeItem !== "function") return;
  const before = getCurrentSalonId();
  try {
    if (salonId && salonId.trim()) {
      storage.setItem(CURRENT_SALON_ID_STORAGE_KEY, salonId);
    } else {
      storage.removeItem(CURRENT_SALON_ID_STORAGE_KEY);
    }
  } catch {
    return;
  }
  const after = getCurrentSalonId();
  if (before !== after) {
    window.dispatchEvent(new CustomEvent(SALON_CHANGED_EVENT, { detail: { salonId: after } }));
  }
}

export async function apiFetch<T>(
  path: string,
  opts: RequestInit & { token?: string } = {},
): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(opts.headers);
  headers.set("Accept", "application/json");
  if (opts.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (opts.token) {
    headers.set("Authorization", `Bearer ${opts.token}`);
  }
  if (!headers.has("X-Salon-Id")) {
    const currentSalonId = getCurrentSalonId();
    if (currentSalonId) {
      headers.set("X-Salon-Id", currentSalonId);
    }
  }
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    const rawBody = await res.text().catch(() => "");
    const detail = extractErrorDetail(rawBody);
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    throw new ApiError(res.status, res.statusText, detail);
  }
  // 204
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
