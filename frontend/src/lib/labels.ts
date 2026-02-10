// Japanese label mappings for API values displayed in the UI.
// All functions fall back to the original value for unknown inputs.

const STATUS_LABELS: Record<string, string> = {
  pending: "承認待ち",
  queued: "キュー待ち",
  posting: "投稿中",
  posted: "投稿済み",
  failed: "失敗",
  skipped: "スキップ",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const MEDIA_STATUS_LABELS: Record<string, string> = {
  pending: "承認待ち",
  uploading: "アップロード中",
  uploaded: "アップロード済み",
  failed: "失敗",
  skipped: "スキップ",
};

export function mediaStatusLabel(status: string): string {
  return MEDIA_STATUS_LABELS[status] ?? status;
}

const POST_TYPE_LABELS: Record<string, string> = {
  STANDARD: "通常投稿",
  OFFER: "特典・クーポン",
  EVENT: "イベント",
};

export function postTypeLabel(type: string): string {
  return POST_TYPE_LABELS[type] ?? type;
}

const MEDIA_FORMAT_LABELS: Record<string, string> = {
  PHOTO: "写真",
  VIDEO: "動画",
};

export function mediaFormatLabel(format: string): string {
  return MEDIA_FORMAT_LABELS[format] ?? format;
}

const MEDIA_CATEGORY_LABELS: Record<string, string> = {
  COVER: "カバー写真",
  PROFILE: "プロフィール",
  EXTERIOR: "外観",
  INTERIOR: "内装",
  PRODUCT: "商品",
  AT_WORK: "仕事風景",
  FOOD_AND_DRINK: "飲食",
  MENU: "メニュー",
  COMMON_AREA: "共用エリア",
  ROOMS: "客室",
  TEAMS: "チーム",
  ADDITIONAL: "その他",
};

export function mediaCategoryLabel(category: string): string {
  return MEDIA_CATEGORY_LABELS[category] ?? category;
}

const SEVERITY_LABELS: Record<string, string> = {
  critical: "緊急",
  high: "重大",
  warning: "警告",
  info: "情報",
  low: "軽微",
};

export function severityLabel(severity: string): string {
  return SEVERITY_LABELS[severity] ?? severity;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  // Backend actual values (from worker/tasks.py)
  oauth_expired: "認証の期限切れ",
  scrape_failed: "データ取得エラー",
  gbp_post_failed: "GBP投稿エラー",
  gbp_media_failed: "GBPメディアアップロードエラー",
  media_download_failed: "メディアダウンロードエラー",
  instagram_token_expiring: "Instagramトークン期限切れ",
  instagram_fetch_failed: "Instagramデータ取得エラー",
  instagram_ingest_failed: "Instagramデータ登録エラー",
  // Possible variations (defensive)
  token_expired: "トークン期限切れ",
  token_expiring: "トークン期限切れ間近",
  post_failed: "投稿エラー",
  upload_failed: "アップロードエラー",
  connection_lost: "接続切断",
  rate_limited: "レート制限",
  gbp_media_upload_failed: "GBPメディアアップロードエラー",
  gbp_upload_failed: "GBPアップロードエラー",
  instagram_token_expired: "Instagramトークン期限切れ",
};

// Common token fragments for fallback translation of unknown alert_type values
const ALERT_TYPE_FRAGMENTS: Array<[RegExp, string]> = [
  [/oauth/i, "認証"],
  [/token/i, "トークン"],
  [/gbp/i, "GBP"],
  [/instagram|ig/i, "Instagram"],
  [/media/i, "メディア"],
  [/scrape/i, "データ取得"],
  [/post/i, "投稿"],
  [/upload/i, "アップロード"],
  [/download/i, "ダウンロード"],
  [/expired?/i, "期限切れ"],
  [/expiring/i, "期限切れ間近"],
  [/failed?/i, "エラー"],
  [/connect/i, "接続"],
  [/fetch/i, "取得"],
  [/ingest/i, "登録"],
];

function humanizeAlertType(type: string): string {
  // Try to build a readable label from known fragments
  const parts: string[] = [];
  const remaining = type.replace(/_/g, " ");
  for (const [pattern, label] of ALERT_TYPE_FRAGMENTS) {
    if (pattern.test(remaining) && !parts.includes(label)) {
      parts.push(label);
    }
  }
  return parts.length > 0 ? parts.join(" ") : type;
}

export function alertTypeLabel(type: string): string {
  return ALERT_TYPE_LABELS[type] ?? humanizeAlertType(type);
}

const CONNECTION_STATUS_LABELS: Record<string, string> = {
  active: "接続中",
  expired: "期限切れ",
  revoked: "無効化済み",
  none: "未接続",
};

export function connectionStatusLabel(status: string): string {
  return CONNECTION_STATUS_LABELS[status] ?? status;
}

const JOB_STATUS_LABELS: Record<string, string> = {
  started: "実行中",
  completed: "完了",
  failed: "失敗",
};

export function jobStatusLabel(status: string): string {
  return JOB_STATUS_LABELS[status] ?? status;
}

const JOB_TYPE_LABELS: Record<string, string> = {
  scrape_blog: "ブログ取得",
  scrape_style: "スタイル取得",
  scrape_coupon: "クーポン取得",
  fetch_instagram: "Instagram取得",
  post_gbp_post: "GBP投稿",
  upload_gbp_media: "GBPメディアアップロード",
  cleanup_media: "メディアクリーンアップ",
};

export function jobTypeLabel(type: string): string {
  return JOB_TYPE_LABELS[type] ?? type;
}

const ROLE_LABELS: Record<string, string> = {
  staff: "スタッフ",
  salon_admin: "サロン管理者",
  super_admin: "管理者",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

// --- Error message translation ---

const EXACT_ERROR_MAP: Record<string, string> = {
  "Post not found": "投稿が見つかりません",
  "Post is not pending": "この投稿は承認待ち状態ではありません",
  "Upload is not pending": "このアップロードは承認待ち状態ではありません",
  "Upload not found": "アップロードが見つかりません",
  "GBP is not connected": "Googleビジネスプロフィールに接続されていません",
  "GBP connection not found": "Googleビジネスプロフィールの接続が見つかりません",
  "Invalid login credentials": "メールアドレスまたはパスワードが正しくありません",
  "Salon slug already exists": "このスラグは既に使用されています",
  "Not found": "データが見つかりません",
  "Unauthorized": "認証されていません。ログインしてください",
  "Forbidden": "アクセス権限がありません",
  "Internal server error": "サーバーエラーが発生しました",
  "Internal Server Error": "サーバーエラーが発生しました",
  "Bad Request": "リクエストが不正です",
  "Token expired": "認証の期限が切れています。再ログインしてください",
  "Invalid token": "認証トークンが無効です。再ログインしてください",
  "User not found": "ユーザーが見つかりません",
  "Email already registered": "このメールアドレスは既に登録されています",
  "Salon not found": "サロンが見つかりません",
  "Location not found": "ロケーションが見つかりません",
  "Alert not found": "アラートが見つかりません",
  "GBP token expired or revoked. Reconnect Google account.":
    "Googleアカウントの認証が期限切れまたは無効化されました。再連携してください",
  "Media asset not available": "メディアファイルが利用できません",
  "GBP API rate limited (429) - max retries exceeded":
    "Google APIのリクエスト制限に達しました。しばらくしてから再度お試しください",
};

// Patterns are evaluated in order — specific patterns MUST come before generic ones.
// Generic fallback patterns (e.g., /not found$/i) MUST remain at the end.
const PATTERN_ERROR_MAP: Array<[RegExp, string]> = [
  // --- Specific service/task patterns (evaluated first) ---
  // GBP API errors: "GBP API error: 401", "GBP API Error: 401 Unauthorized - ..."
  [/GBP API.*\b40[13]\b/i, "Googleアカウントの認証が期限切れです。GBP設定から再連携してください"],
  [/GBP API.*\b429\b/i, "Google APIのリクエスト制限に達しました。しばらくしてから再度お試しください"],
  [/GBP API.*\b5\d{2}\b/i, "Google APIでサーバーエラーが発生しました。しばらくしてから再度お試しください"],
  [/GBP API.*error/i, "Googleビジネスプロフィールとの通信でエラーが発生しました"],
  // GBP task alert messages: "GBP post failed: ...", "GBP media upload failed: ..."
  [/^GBP post failed/i, "GBP投稿に失敗しました"],
  [/^GBP media upload failed/i, "GBPメディアアップロードに失敗しました"],
  // HotPepper scraper alert messages
  [/HotPepper blog list fetch failed/i, "HotPepperブログ記事一覧の取得に失敗しました"],
  [/HotPepper blog ingest failed/i, "HotPepperブログ記事の登録に失敗しました"],
  [/HotPepper style fetch failed/i, "HotPepperスタイル画像の取得に失敗しました"],
  [/HotPepper style ingest failed/i, "HotPepperスタイル画像の登録に失敗しました"],
  [/HotPepper coupon fetch failed/i, "HotPepperクーポンの取得に失敗しました"],
  [/HotPepper coupon ingest failed/i, "HotPepperクーポンの登録に失敗しました"],
  // Instagram alert messages
  [/Instagram token refresh failed/i, "Instagramの認証トークン更新に失敗しました。再連携が必要です"],
  [/Instagram fetch failed/i, "Instagramデータの取得に失敗しました"],
  [/Instagram ingest failed/i, "Instagramデータの登録に失敗しました"],
  // Media download alert messages
  [/Media download failed/i, "メディアファイルのダウンロードに失敗しました"],
  // --- Generic patterns (evaluated last, before fallback) ---
  [/Network error|fetch failed|Failed to fetch/i, "ネットワークエラーが発生しました。接続を確認してください"],
  [/timeout|timed out/i, "リクエストがタイムアウトしました。再度お試しください"],
  [/rate limit/i, "リクエスト制限に達しました。しばらくしてから再度お試しください"],
  [/already exists/i, "既に存在するデータです"],
  // Generic fallback patterns (keep at the very end)
  [/not found$/i, "データが見つかりません"],
];

export function translateError(message: string): string {
  if (!message) return message;

  const exact = EXACT_ERROR_MAP[message];
  if (exact) {
    if (import.meta.env.DEV) console.warn("[translateError]", message);
    return exact;
  }

  for (const [pattern, translation] of PATTERN_ERROR_MAP) {
    if (pattern.test(message)) {
      if (import.meta.env.DEV) console.warn("[translateError]", message);
      return translation;
    }
  }

  return message;
}
