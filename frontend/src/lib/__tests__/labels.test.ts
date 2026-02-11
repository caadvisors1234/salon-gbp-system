import { describe, it, expect } from "vitest";
import {
  statusLabel,
  mediaStatusLabel,
  postTypeLabel,
  mediaFormatLabel,
  mediaCategoryLabel,
  severityLabel,
  alertTypeLabel,
  connectionStatusLabel,
  jobStatusLabel,
  jobTypeLabel,
  roleLabel,
  translateError,
  ctaTypeLabel,
} from "../labels";

describe("statusLabel", () => {
  it("translates known status", () => {
    expect(statusLabel("pending")).toBe("承認待ち");
    expect(statusLabel("posted")).toBe("投稿済み");
  });

  it("returns original value for unknown status", () => {
    expect(statusLabel("unknown_status")).toBe("unknown_status");
  });
});

describe("mediaStatusLabel", () => {
  it("translates known status", () => {
    expect(mediaStatusLabel("uploading")).toBe("アップロード中");
  });

  it("returns original value for unknown status", () => {
    expect(mediaStatusLabel("xyz")).toBe("xyz");
  });
});

describe("postTypeLabel", () => {
  it("translates known type", () => {
    expect(postTypeLabel("STANDARD")).toBe("通常投稿");
    expect(postTypeLabel("OFFER")).toBe("特典・クーポン");
  });

  it("returns original value for unknown type", () => {
    expect(postTypeLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});

describe("mediaFormatLabel", () => {
  it("translates known format", () => {
    expect(mediaFormatLabel("PHOTO")).toBe("写真");
  });

  it("returns original value for unknown format", () => {
    expect(mediaFormatLabel("GIF")).toBe("GIF");
  });
});

describe("mediaCategoryLabel", () => {
  it("translates known category", () => {
    expect(mediaCategoryLabel("EXTERIOR")).toBe("外観");
  });

  it("returns original value for unknown category", () => {
    expect(mediaCategoryLabel("OTHER")).toBe("OTHER");
  });
});

describe("severityLabel", () => {
  it("translates known severity", () => {
    expect(severityLabel("critical")).toBe("緊急");
  });

  it("returns original value for unknown severity", () => {
    expect(severityLabel("unknown")).toBe("unknown");
  });
});

describe("alertTypeLabel", () => {
  it("translates known alert type", () => {
    expect(alertTypeLabel("oauth_expired")).toBe("認証の期限切れ");
  });

  it("humanizes unknown alert type from fragments", () => {
    expect(alertTypeLabel("gbp_token_failed")).toContain("GBP");
  });

  it("returns original value when no fragments match", () => {
    expect(alertTypeLabel("zzz_qqq")).toBe("zzz_qqq");
  });
});

describe("connectionStatusLabel", () => {
  it("translates known status", () => {
    expect(connectionStatusLabel("active")).toBe("接続中");
  });

  it("returns original value for unknown status", () => {
    expect(connectionStatusLabel("pending")).toBe("pending");
  });
});

describe("jobStatusLabel", () => {
  it("translates known status", () => {
    expect(jobStatusLabel("completed")).toBe("完了");
  });

  it("returns original value for unknown status", () => {
    expect(jobStatusLabel("queued")).toBe("queued");
  });
});

describe("jobTypeLabel", () => {
  it("translates known type", () => {
    expect(jobTypeLabel("scrape_blog")).toBe("ブログ取得");
  });

  it("returns original value for unknown type", () => {
    expect(jobTypeLabel("custom_job")).toBe("custom_job");
  });
});

describe("roleLabel", () => {
  it("translates known role", () => {
    expect(roleLabel("super_admin")).toBe("管理者");
  });

  it("returns original value for unknown role", () => {
    expect(roleLabel("viewer")).toBe("viewer");
  });
});

describe("ctaTypeLabel", () => {
  it("translates known CTA type", () => {
    expect(ctaTypeLabel("BOOK")).toBe("予約");
    expect(ctaTypeLabel("LEARN_MORE")).toBe("詳細を見る");
  });

  it("returns （なし） for null", () => {
    expect(ctaTypeLabel(null)).toBe("（なし）");
  });

  it("returns original value for unknown type", () => {
    expect(ctaTypeLabel("UNKNOWN_CTA")).toBe("UNKNOWN_CTA");
  });
});

describe("translateError", () => {
  it("returns exact match translation", () => {
    expect(translateError("Not found")).toBe("データが見つかりません");
    expect(translateError("Forbidden")).toBe("アクセス権限がありません");
  });

  it("returns pattern match translation", () => {
    expect(translateError("Network error: connection refused")).toBe(
      "ネットワークエラーが発生しました。接続を確認してください",
    );
    expect(translateError("GBP API error: 401 Unauthorized")).toBe(
      "Googleアカウントの認証が期限切れです。GBP設定から再連携してください",
    );
    expect(translateError("GBP API error: 429 Too Many Requests")).toBe(
      "Google APIのリクエスト制限に達しました。しばらくしてから再度お試しください",
    );
    expect(translateError("GBP API error: 500")).toBe(
      "Google APIでサーバーエラーが発生しました。しばらくしてから再度お試しください",
    );
  });

  it("returns original message for unmatched error", () => {
    expect(translateError("Something completely unexpected")).toBe(
      "Something completely unexpected",
    );
  });

  it("returns empty string as-is", () => {
    expect(translateError("")).toBe("");
  });

  it("translates HotPepper scraper errors", () => {
    expect(translateError("HotPepper blog list fetch failed for salon abc")).toBe(
      "HotPepperブログ記事一覧の取得に失敗しました",
    );
    expect(translateError("HotPepper style fetch failed: timeout")).toBe(
      "HotPepperスタイル画像の取得に失敗しました",
    );
    expect(translateError("HotPepper coupon ingest failed")).toBe(
      "HotPepperクーポンの登録に失敗しました",
    );
  });

  it("translates Instagram errors", () => {
    expect(translateError("Instagram token refresh failed for account X")).toBe(
      "Instagramの認証トークン更新に失敗しました。再連携が必要です",
    );
    expect(translateError("Instagram fetch failed: rate limited")).toBe(
      "Instagramデータの取得に失敗しました",
    );
  });

  it("translates media download errors", () => {
    expect(translateError("Media download failed: 404")).toBe(
      "メディアファイルのダウンロードに失敗しました",
    );
  });

  it("translates GBP post/media task errors", () => {
    expect(translateError("GBP post failed: 500 Internal Server Error")).toBe(
      "GBP投稿に失敗しました",
    );
    expect(translateError("GBP media upload failed: timeout")).toBe(
      "GBPメディアアップロードに失敗しました",
    );
  });

  it("translates 400 error with response body", () => {
    expect(
      translateError('GBP API error: 400 - {"error":{"message":"Invalid argument"}}'),
    ).toBe("GBP投稿データに不正な値があります。内容を確認してください");
  });

  it("translates 404 error", () => {
    expect(
      translateError("GBP API error: 404 - Not Found"),
    ).toBe("GBPロケーションが見つかりません。GBP設定を確認してください");
  });

  it("translates connection expired error", () => {
    expect(
      translateError("GBP connection is expired. Reconnect Google account."),
    ).toBe("Googleアカウントの接続が期限切れです。GBP設定から再連携してください");
  });

  it("translates connection revoked error", () => {
    expect(
      translateError("GBP connection is revoked. Reconnect Google account."),
    ).toBe("Googleアカウントの接続が無効化されました。GBP設定から再連携してください");
  });

  it("falls through to generic connection pattern for unknown status", () => {
    expect(
      translateError("GBP connection is disconnected. Reconnect Google account."),
    ).toBe("Googleアカウントの接続が無効です。GBP設定から再連携してください");
  });

  it("still matches 401/403 with response body appended", () => {
    expect(
      translateError('GBP API error: 401 - {"error":"UNAUTHENTICATED"}'),
    ).toBe("Googleアカウントの認証が期限切れです。GBP設定から再連携してください");
    expect(
      translateError('GBP API error: 403 - {"error":"PERMISSION_DENIED"}'),
    ).toBe("Googleアカウントの認証が期限切れです。GBP設定から再連携してください");
  });

  it("falls through to catch-all for unhandled status codes", () => {
    expect(translateError("GBP API error: 409 - Conflict")).toBe(
      "Googleビジネスプロフィールとの通信でエラーが発生しました",
    );
  });

  it("does not false-match status codes embedded in longer numbers", () => {
    // \b boundaries should prevent "4011" from matching /\b40[13]\b/
    expect(translateError("GBP API error code 4011")).not.toBe(
      "Googleアカウントの認証が期限切れです。GBP設定から再連携してください",
    );
  });
});
