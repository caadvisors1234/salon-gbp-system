import { describe, it, expect } from "vitest";
import {
  required,
  email,
  url,
  uuid,
  slug,
  maxLength,
  pattern,
  hotpepperUrl,
  validate,
  validateForm,
} from "../validation";

describe("required", () => {
  const v = required("名前");
  it("returns error for empty string", () => {
    expect(v("")).toBe("名前は必須です");
    expect(v("   ")).toBe("名前は必須です");
  });
  it("returns null for non-empty", () => {
    expect(v("hello")).toBeNull();
  });
});

describe("email", () => {
  const v = email();
  it("returns null for valid emails", () => {
    expect(v("test@example.com")).toBeNull();
    expect(v("user+tag@domain.co.jp")).toBeNull();
  });
  it("returns error for invalid emails", () => {
    expect(v("notanemail")).toBe("メールアドレスの形式が正しくありません");
    expect(v("@nodomain")).toBe("メールアドレスの形式が正しくありません");
  });
  it("returns null for empty (optional)", () => {
    expect(v("")).toBeNull();
  });
});

describe("url", () => {
  const v = url();
  it("returns null for valid URLs", () => {
    expect(v("https://example.com")).toBeNull();
    expect(v("http://localhost:3000/path")).toBeNull();
  });
  it("returns error for invalid URLs", () => {
    expect(v("not-a-url")).toBe("URLの形式が正しくありません");
  });
  it("returns null for empty", () => {
    expect(v("")).toBeNull();
  });
});

describe("uuid", () => {
  const v = uuid();
  it("returns null for valid UUID", () => {
    expect(v("550e8400-e29b-41d4-a716-446655440000")).toBeNull();
  });
  it("returns error for invalid UUID", () => {
    expect(v("not-a-uuid")).toBe("UUIDの形式が正しくありません");
    expect(v("550e8400e29b41d4a716446655440000")).toBe("UUIDの形式が正しくありません");
  });
  it("returns null for empty", () => {
    expect(v("")).toBeNull();
  });
});

describe("slug", () => {
  const v = slug();
  it("returns null for valid slugs", () => {
    expect(v("my-salon")).toBeNull();
    expect(v("salon123")).toBeNull();
    expect(v("a")).toBeNull();
  });
  it("returns error for invalid slugs", () => {
    expect(v("My-Salon")).toBe("英小文字・数字・ハイフンのみ使用できます");
    expect(v("salon_name")).toBe("英小文字・数字・ハイフンのみ使用できます");
    expect(v("-start")).toBe("英小文字・数字・ハイフンのみ使用できます");
  });
  it("returns null for empty", () => {
    expect(v("")).toBeNull();
  });
});

describe("maxLength", () => {
  const v = maxLength(5);
  it("returns null for short strings", () => {
    expect(v("abc")).toBeNull();
    expect(v("abcde")).toBeNull();
  });
  it("returns error for long strings", () => {
    expect(v("abcdef")).toBe("5文字以内で入力してください");
  });
});

describe("pattern", () => {
  const v = pattern(/^\d+$/, "数字のみ");
  it("returns null for matching strings", () => {
    expect(v("123")).toBeNull();
  });
  it("returns error for non-matching", () => {
    expect(v("abc")).toBe("数字のみ");
  });
  it("returns null for empty", () => {
    expect(v("")).toBeNull();
  });
});

describe("hotpepperUrl", () => {
  const v = hotpepperUrl();
  it("returns null for valid HotPepper URL", () => {
    expect(v("https://beauty.hotpepper.jp/slnH000232182/")).toBeNull();
    expect(v("https://beauty.hotpepper.jp/slnH000232182")).toBeNull();
  });
  it("returns error for invalid URL", () => {
    expect(v("https://example.com")).toBeTruthy();
    expect(v("https://beauty.hotpepper.jp/")).toBeTruthy();
  });
  it("returns null for empty", () => {
    expect(v("")).toBeNull();
  });
});

describe("validate", () => {
  it("returns first error from chain", () => {
    const result = validate("", required("名前"), maxLength(10));
    expect(result).toBe("名前は必須です");
  });
  it("returns null when all pass", () => {
    const result = validate("hello", required("名前"), maxLength(10));
    expect(result).toBeNull();
  });
  it("chains validators correctly", () => {
    const result = validate("a".repeat(11), required("名前"), maxLength(10));
    expect(result).toBe("10文字以内で入力してください");
  });
});

describe("validateForm", () => {
  it("returns errors for invalid fields", () => {
    const errors = validateForm(
      { name: "", slug: "Hello" },
      { name: [required("名前")], slug: [slug()] },
    );
    expect(errors.name).toBe("名前は必須です");
    expect(errors.slug).toBe("英小文字・数字・ハイフンのみ使用できます");
  });
  it("returns empty object for valid form", () => {
    const errors = validateForm(
      { name: "Test", slug: "test-slug" },
      { name: [required("名前")], slug: [slug()] },
    );
    expect(Object.keys(errors)).toHaveLength(0);
  });
});
