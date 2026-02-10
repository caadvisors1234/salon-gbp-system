import { describe, it, expect, vi, afterEach } from "vitest";
import { formatDateTime, formatDate, formatRelative } from "../format";

describe("formatDateTime", () => {
  it("formats ISO string to ja-JP datetime", () => {
    const result = formatDateTime("2024-03-15T10:30:00Z");
    expect(result).toContain("2024");
    expect(result).toContain("03");
    expect(result).toContain("15");
  });

  it("returns empty string for null", () => {
    expect(formatDateTime(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDateTime(undefined)).toBe("");
  });

  it("returns original value for invalid date", () => {
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDate", () => {
  it("formats ISO string to ja-JP date only", () => {
    const result = formatDate("2024-06-01T00:00:00Z");
    expect(result).toContain("2024");
    expect(result).toContain("06");
    expect(result).toContain("01");
  });

  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns original value for invalid date", () => {
    expect(formatDate("nope")).toBe("nope");
  });
});

describe("formatRelative", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty string for null", () => {
    expect(formatRelative(null)).toBe("");
  });

  it('returns "たった今" for very recent times', () => {
    vi.useFakeTimers();
    const now = new Date("2024-01-01T12:00:00Z");
    vi.setSystemTime(now);
    expect(formatRelative("2024-01-01T12:00:00Z")).toBe("たった今");
  });

  it('returns "X分前" for minutes ago', () => {
    vi.useFakeTimers();
    const now = new Date("2024-01-01T12:30:00Z");
    vi.setSystemTime(now);
    expect(formatRelative("2024-01-01T12:00:00Z")).toBe("30分前");
  });

  it('returns "X時間前" for hours ago', () => {
    vi.useFakeTimers();
    const now = new Date("2024-01-01T15:00:00Z");
    vi.setSystemTime(now);
    expect(formatRelative("2024-01-01T12:00:00Z")).toBe("3時間前");
  });

  it('returns "X日前" for days ago', () => {
    vi.useFakeTimers();
    const now = new Date("2024-01-04T12:00:00Z");
    vi.setSystemTime(now);
    expect(formatRelative("2024-01-01T12:00:00Z")).toBe("3日前");
  });

  it("returns formatted date for over 7 days", () => {
    vi.useFakeTimers();
    const now = new Date("2024-01-15T12:00:00Z");
    vi.setSystemTime(now);
    const result = formatRelative("2024-01-01T12:00:00Z");
    expect(result).toContain("2024");
    expect(result).toContain("01");
  });
});
