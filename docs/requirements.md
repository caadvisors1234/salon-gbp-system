# 要件定義書

## サロン向け GBP 自動投稿連携システム

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [機能一覧とフェーズ計画](#2-機能一覧とフェーズ計画)
3. [システムアーキテクチャ](#3-システムアーキテクチャ)
4. [データモデル](#4-データモデル)
5. [機能詳細仕様](#5-機能詳細仕様)
6. [管理画面（Web UI）仕様](#6-管理画面web-ui仕様)
7. [外部サービス連携の前提条件と制約](#7-外部サービス連携の前提条件と制約)
8. [セキュリティ要件](#8-セキュリティ要件)
9. [非機能要件](#9-非機能要件)
10. [開発ロードマップ](#10-開発ロードマップ)
11. [リスクと対策](#11-リスクと対策)
12. [今後の確認・決定事項](#12-今後の確認決定事項)
13. [付録](#付録)

---

## 1. プロジェクト概要

### 1.1 目的

美容サロンが HotPepper Beauty および Instagram で行っているコンテンツ更新を、Google ビジネスプロフィール（以下 GBP）へ自動的に反映するクローズド SaaS アプリケーションを構築する。サロンスタッフの運用負荷を削減し、GBP の情報鮮度を維持することで、ローカル SEO の強化と集客向上を支援する。

### 1.2 利用形態

| 項目 | 内容 |
|------|------|
| 提供形態 | クローズド SaaS（自社契約サロン向け） |
| 利用者 | 契約サロンのスタッフ（管理画面を操作） |
| 運営主体 | サロン集客支援企業（自社） |
| 課金 | アプリ内課金機能なし（契約ベースで別管理） |

### 1.3 技術スタック

| レイヤー | 技術 | 備考 |
|----------|------|------|
| コンテナ | Docker / Docker Compose | 全サービスをコンテナ化 |
| バックエンド | Python（FastAPI 推奨） | 非同期対応、型ヒント、自動ドキュメント生成 |
| 認証 | Supabase Auth | 認証のみ利用。DB は使用しない |
| データベース | PostgreSQL（VPS 上に Docker で構築） | アプリケーション専用 DB |
| ジョブキュー | Celery + Redis | 定期ジョブ・非同期タスク管理 |
| GBP 連携 | Google Business Profile API（My Business API v4） | 投稿・写真アップロード |
| Instagram 連携 | Instagram Graph API（Meta） | フィード投稿取得 |
| HotPepper 連携 | Web スクレイピング（httpx + BeautifulSoup4） | ブログ・スタイル・クーポン取得 |
| デプロイ先 | VPS（ConoHa） | Docker Compose でデプロイ |

---

## 2. 機能一覧とフェーズ計画

段階リリース方針に基づき、3フェーズ＋準備フェーズに分割する。

### 2.1 Phase 0: 環境構築・API 申請

| # | タスク | 内容 |
|---|--------|------|
| T-01 | GBP API 利用申請 | GBP API contact form でアクセス申請を提出。審査に約14日を要する |
| T-02 | OAuth 同意画面設定 | 「外部」ユーザータイプで設定。本番公開前に Google の OAuth verification 審査が必要 |
| T-03 | Docker 環境構築 | Docker Compose による開発・本番環境のセットアップ |
| T-04 | PostgreSQL セットアップ | VPS 上に Docker で PostgreSQL を構築。初期スキーマ・マイグレーション基盤整備 |
| T-05 | Supabase Auth 設定 | Supabase プロジェクト作成、JWT 検証設定、FastAPI との統合 |
| T-06 | CI/CD 構築 | GitHub Actions 等による自動テスト・デプロイパイプライン |

### 2.2 Phase 1: MVP

| # | 機能 | 概要 |
|---|------|------|
| F-01 | ユーザー認証・テナント管理 | Supabase Auth によるログイン、サロン（テナント）の登録・管理 |
| F-02 | HotPepper ブログ → GBP 投稿連携 | ブログの新規記事を検知し、GBP の「最新情報」として自動投稿 |
| F-03 | 管理画面（基本） | 連携設定、投稿履歴閲覧、エラーアラート表示 |
| F-04 | GBP OAuth 連携フロー | サロンが自身の Google アカウントで GBP を認証・連携 |

### 2.3 Phase 2: Instagram 連携

| # | 機能 | 概要 |
|---|------|------|
| F-05 | Instagram → GBP 投稿連携 | フィード投稿を GBP の「最新情報」に自動投稿 |
| F-06 | Instagram アカウント管理 | サロン公式＋スタッフ個人アカウントの追加・削除・種別設定 |
| F-07 | 投稿プレビュー・編集機能 | GBP 投稿前にサロン側がテキスト・画像を確認・修正可能にする |

### 2.4 Phase 3: 拡張機能

| # | 機能 | 概要 |
|---|------|------|
| F-08 | ヘアスタイル画像 → GBP 写真連携 | ヘアスタイル画像の更新を検知し、GBP の写真セクションにアップロード |
| F-09 | クーポン → GBP OFFER 投稿連携 | クーポン作成を検知し、GBP の OFFER 投稿として自動投稿 |
| F-10 | 管理画面（拡張） | ダッシュボード、投稿分析、一括管理機能 |

---

## 3. システムアーキテクチャ

### 3.1 全体構成

全サービスを Docker Compose で VPS 上に構築する。Supabase は Cloud 版を認証のみに使用し、データベースは VPS ローカルの PostgreSQL コンテナを使用する。

```
┌──────────────────────────────────────────────────────────────────┐
│  VPS (Docker Compose)                                          │
│                                                                │
│  ┌──────────┐  ┌───────────┐  ┌─────────────┐  ┌───────────┐  │
│  │  Nginx   │──│  FastAPI  │──│ PostgreSQL  │  │   Redis   │  │
│  │ (Proxy)  │  │  (API)    │  │ (Docker)    │  │  (Queue)  │  │
│  └──────────┘  └─────┬─────┘  └─────────────┘  └─────┬─────┘  │
│                      │                                │        │
│                ┌─────┴────────────────────────────────┴──┐     │
│                │          Celery Worker                   │     │
│                │   (スクレイピング・投稿ジョブ実行)        │     │
│                └─────┬──────────────┬──────────────┬──────┘     │
│                      │              │              │            │
│              ┌───────▼──┐  ┌────────▼───┐  ┌──────▼──────┐    │
│              │HotPepper │  │ Instagram  │  │  GBP API    │    │
│              │ Scraper  │  │ Graph API  │  │  (Google)   │    │
│              └──────────┘  └────────────┘  └─────────────┘    │
│                                                                │
│         ┌────────────────────────────────┐                     │
│         │  Supabase Cloud (認証のみ)      │ ◄── 外部サービス   │
│         └────────────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Docker Compose サービス構成

| コンテナ | イメージ | 役割 |
|----------|----------|------|
| nginx | nginx:alpine | リバースプロキシ、SSL 終端（Let's Encrypt） |
| api | python:3.12-slim（カスタム） | FastAPI アプリケーション（REST API + 管理画面 API） |
| worker | 同上（Celery Worker） | 定期スクレイピング・GBP 投稿・Instagram 取得ジョブ |
| beat | 同上（Celery Beat） | 定期ジョブのスケジューラ |
| db | postgres:16-alpine | PostgreSQL データベース |
| redis | redis:7-alpine | Celery ジョブキュー / キャッシュ |

### 3.3 認証アーキテクチャ

Supabase Auth を認証基盤として使用するが、Supabase のデータベース機能は使用しない。FastAPI 側で JWT トークンを検証し、アプリケーション独自の PostgreSQL でデータを管理する。

```
[ブラウザ] ──(1) ログイン──► [Supabase Auth]
                                     │
                               (2) JWT 発行
                                     │
                                     ▼
[ブラウザ] ──(3) JWT 付きリクエスト──► [FastAPI]
                                          │
                               (4) JWT 検証（Supabase 公開鍵）
                               (5) user_id 抽出
                               (6) app_users テーブルで salon_id 解決
                                          │
                                          ▼
                                     [PostgreSQL]
                               (7) salon_id に基づくデータアクセス
```

### 3.4 マルチテナント設計

**方式:** 論理分離（単一 DB + salon_id による行レベル分離）

**設計方針:**

- 全テーブルに salon_id カラムを付与し、アプリケーション層で `WHERE salon_id = :current_salon_id` を強制
- FastAPI の Dependency Injection でリクエストごとに current_salon_id を解決し、全クエリに自動適用
- SQLAlchemy のイベントリスナーまたはカスタム Session で salon_id フィルタを自動挿入
- 管理者（自社スタッフ）は全テナントにアクセス可能なスーパーユーザー権限を持つ

**選定理由:**

- クローズド SaaS でテナント数が数十〜数百規模のため、DB 分離はオーバーエンジニアリング
- マイグレーションやスキーマ変更が 1 回で済み、運用コストが低い
- VPS リソースの効率的な利用が可能

### 3.5 定期実行スケジュール

| ジョブ | 頻度 | 内容 | Phase |
|--------|------|------|-------|
| HotPepper ブログ巡回 | 4時間ごと（1日6回） | 各サロンのブログページをスクレイピングし新規記事を検知 | 1 |
| HotPepper スタイル画像巡回 | 6時間ごと（1日4回） | ヘアスタイルページの画像更新を検知 | 3 |
| HotPepper クーポン巡回 | 6時間ごと（1日4回） | クーポンページの更新を検知 | 3 |
| Instagram フィード巡回 | 4時間ごと（1日6回） | 各連携アカウントの最新投稿を取得 | 2 |
| GBP トークンリフレッシュ | 1日1回 | 有効期限切れ前にトークンを自動更新 | 1 |
| Instagram トークンリフレッシュ | **30日ごと**（期限到来30日前目安） | 60日有効の長期トークンを期限前に更新 | 2 |
| 死活監視・ヘルスチェック | 5分ごと | 各外部サービスへの接続確認 | 1 |

---

## 4. データモデル

全テーブルに salon_id を付与し、アプリケーション層でテナント分離を実現する。主キーは UUID v4 を使用する。タイムスタンプは UTC で格納する。

### 4.1 テナント・ユーザー管理

#### salons（サロン / テナント）

| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | サロンID（テナントID） |
| name | VARCHAR(255) | NOT NULL | サロン名 |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | URL用識別子 |
| hotpepper_salon_id | VARCHAR(100) | NULLABLE | HotPepper Beauty のサロン ID（slnH 以降） |
| hotpepper_blog_url | TEXT | NULLABLE | ブログ一覧ページURL |
| hotpepper_style_url | TEXT | NULLABLE | スタイル一覧ページURL |
| hotpepper_coupon_url | TEXT | NULLABLE | クーポン一覧ページURL |
| is_active | BOOLEAN | DEFAULT true | 有効/無効フラグ |
| created_at | TIMESTAMPTZ | DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT now() | 更新日時 |

#### app_users（アプリケーションユーザー）

| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 内部ユーザーID |
| salon_id | UUID | **FK → salons.id, NULLABLE** | 所属サロンID |
| supabase_user_id | UUID | UNIQUE, NOT NULL | Supabase Auth のユーザーID |
| email | VARCHAR(255) | NOT NULL | メールアドレス |
| display_name | VARCHAR(100) | NULLABLE | 表示名 |
| role | VARCHAR(20) | NOT NULL, DEFAULT 'staff' | 権限（super_admin / salon_admin / staff） |
| is_active | BOOLEAN | DEFAULT true | 有効/無効フラグ |
| created_at | TIMESTAMPTZ | DEFAULT now() | 作成日時 |
| updated_at | TIMESTAMPTZ | DEFAULT now() | 更新日時 |

### 4.2 外部サービス連携

#### gbp_connections（GBP 連携情報）

| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | UUID | PK | |
| salon_id | UUID | FK → salons.id, NOT NULL | 所属サロンID |
| google_account_email | VARCHAR(255) | NOT NULL | 認証した Google アカウント |
| account_id | VARCHAR(255) | NOT NULL | GBP アカウントID |
| location_id | VARCHAR(255) | NOT NULL | GBP ロケーションID |
| location_name | VARCHAR(255) | NULLABLE | ロケーション表示名 |
| access_token_enc | TEXT | NOT NULL | アクセストークン（AES-256-GCM 暗号化） |
| refresh_token_enc | TEXT | NOT NULL | リフレッシュトークン（AES-256-GCM 暗号化） |
| token_expires_at | TIMESTAMPTZ | NOT NULL | トークン有効期限 |
| status | VARCHAR(20) | DEFAULT 'active' | active / expired / revoked |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

#### instagram_accounts（Instagram 連携アカウント）

| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | UUID | PK | |
| salon_id | UUID | FK → salons.id, NOT NULL | 所属サロンID |
| ig_user_id | VARCHAR(100) | NOT NULL | Instagram ユーザーID |
| ig_username | VARCHAR(100) | NOT NULL | Instagram ユーザー名 |
| account_type | VARCHAR(20) | NOT NULL | official（公式） / staff（スタッフ個人） |
| staff_name | VARCHAR(100) | NULLABLE | スタッフ名（account_type=staff 時） |
| access_token_enc | TEXT | NOT NULL | 長期トークン（暗号化） |
| token_expires_at | TIMESTAMPTZ | NOT NULL | トークン有効期限 |
| is_active | BOOLEAN | DEFAULT true | 有効/無効 |
| sync_hashtags | BOOLEAN | DEFAULT false | ハッシュタグをGBP投稿に含めるか |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |

### 4.3 コンテンツ・投稿管理

#### source_contents（取得コンテンツ）

UNIQUE制約: (salon_id, source_type, source_id) — 同一コンテンツの重複登録を防止

| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | UUID | PK | |
| salon_id | UUID | FK → salons.id, NOT NULL | 所属サロンID |
| source_type | VARCHAR(30) | NOT NULL | hotpepper_blog / hotpepper_style / hotpepper_coupon / instagram |
| source_id | VARCHAR(500) | NOT NULL | 元サイトでの識別子（URL or 投稿ID） |
| instagram_account_id | UUID | FK → instagram_accounts.id, NULLABLE | Instagram 投稿の場合の連携アカウント |
| title | TEXT | NULLABLE | タイトル |
| body_html | TEXT | NULLABLE | 元の HTML/テキスト |
| body_text | TEXT | NULLABLE | 変換後のプレーンテキスト |
| image_urls | JSONB | DEFAULT '[]' | 画像URLの配列 |
| source_url | TEXT | NULLABLE | 元記事/投稿の URL |
| source_published_at | TIMESTAMPTZ | NULLABLE | 元の公開日時 |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

#### gbp_posts（GBP 投稿履歴）

| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | UUID | PK | |
| salon_id | UUID | FK → salons.id, NOT NULL | 所属サロンID |
| source_content_id | UUID | FK → source_contents.id, NOT NULL | 元コンテンツID |
| gbp_connection_id | UUID | FK → gbp_connections.id, NOT NULL | GBP 連携ID |
| post_type | VARCHAR(20) | NOT NULL | STANDARD / OFFER / EVENT |
| summary | TEXT | NOT NULL | 投稿テキスト |
| image_url | TEXT | NULLABLE | 投稿画像 URL |
| cta_type | VARCHAR(50) | NULLABLE | CallToAction タイプ |
| cta_url | TEXT | NULLABLE | CallToAction URL |
| gbp_post_id | VARCHAR(255) | NULLABLE | GBP 側の投稿 ID（投稿成功時） |
| status | VARCHAR(20) | DEFAULT 'pending' | pending / posted / failed / skipped |
| error_message | TEXT | NULLABLE | エラー時のメッセージ |
| posted_at | TIMESTAMPTZ | NULLABLE | GBP への投稿日時 |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

#### gbp_media_uploads（GBP 写真アップロード履歴）

| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | UUID | PK | |
| salon_id | UUID | FK → salons.id, NOT NULL | 所属サロンID |
| source_content_id | UUID | FK → source_contents.id, NOT NULL | 元コンテンツID |
| gbp_connection_id | UUID | FK → gbp_connections.id, NOT NULL | GBP 連携ID |
| media_format | VARCHAR(10) | NOT NULL | PHOTO / VIDEO |
| category | VARCHAR(30) | DEFAULT 'ADDITIONAL' | ADDITIONAL / EXTERIOR 等 |
| source_image_url | TEXT | NOT NULL | 元画像の URL |
| gbp_media_name | VARCHAR(255) | NULLABLE | GBP 側のメディア名（アップロード成功時） |
| status | VARCHAR(20) | DEFAULT 'pending' | pending / uploaded / failed |
| error_message | TEXT | NULLABLE | エラー時のメッセージ |
| uploaded_at | TIMESTAMPTZ | NULLABLE | アップロード日時 |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

#### job_logs（ジョブ実行ログ）

| カラム | 型 | 制約 | 説明 |
|--------|---|------|------|
| id | UUID | PK | |
| salon_id | UUID | FK → salons.id, NULLABLE | 対象サロン（全体ジョブは NULL） |
| job_type | VARCHAR(50) | NOT NULL | scrape_blog / scrape_style / scrape_coupon / fetch_instagram / post_gbp / upload_media |
| status | VARCHAR(20) | NOT NULL | started / completed / failed |
| items_found | INTEGER | DEFAULT 0 | 検出した新規アイテム数 |
| items_processed | INTEGER | DEFAULT 0 | 処理完了アイテム数 |
| error_message | TEXT | NULLABLE | エラー詳細 |
| started_at | TIMESTAMPTZ | NOT NULL | ジョブ開始日時 |
| completed_at | TIMESTAMPTZ | NULLABLE | ジョブ完了日時 |

### 4.4 インデックス設計

| テーブル | インデックス | 目的 |
|----------|------------|------|
| source_contents | UNIQUE (salon_id, source_type, source_id) | 重複コンテンツ防止 |
| source_contents | INDEX (salon_id, source_type, created_at DESC) | サロン別コンテンツ一覧 |
| gbp_posts | INDEX (salon_id, status, created_at DESC) | サロン別投稿履歴 |
| gbp_posts | INDEX (source_content_id) | 元コンテンツからの逆引き |
| gbp_media_uploads | INDEX (salon_id, status) | アップロードステータス検索 |
| job_logs | INDEX (salon_id, job_type, started_at DESC) | ジョブ履歴検索 |
| app_users | UNIQUE (supabase_user_id) | Supabase ユーザーの一意性 |

---

## 5. 機能詳細仕様

### 5.1 F-02: HotPepper Beauty ブログ → GBP 投稿連携

#### 5.1.1 データ取得（スクレイピング）

| 項目 | 内容 |
|------|------|
| 取得対象 URL | `https://beauty.hotpepper.jp/slnH{salon_id}/blog/` |
| 取得方法 | Python（httpx + BeautifulSoup4） |
| 取得頻度 | 4時間ごと（1日6回）、Celery Beat でスケジューリング |
| 新規記事判定 | 記事URLの一覧を取得し、source_contents テーブルの source_id（=記事URL）に未登録のものを新規と判定 |
| 取得内容 | 記事タイトル、本文 HTML、サムネイル画像 URL、公開日時、記事 URL |
| サロン間の分散 | サロンごとに5秒以上の間隔を空けてリクエスト |

#### 5.1.2 テキスト変換パイプライン

方式: HTML タグ除去＋自動整形。Phase 2 で投稿前プレビュー・編集機能を追加する。

| ステップ | 処理 | 詳細 |
|----------|------|------|
| 1 | HTML パース | BeautifulSoup4 で HTML をパース |
| 2 | 不要タグ除去 | `<script>`, `<style>`, `<nav>`, `<footer>`, `<aside>` タグを除去 |
| 3 | 改行変換 | `<br>`, `<p>`, `<div>` の閉じタグを改行文字に変換 |
| 4 | 画像抽出 | `<img>` タグから最初の画像 URL を抽出（GBP 投稿画像用） |
| 5 | テキスト抽出 | 残りテキストを取得し、連続空白・改行を正規化 |
| 6 | ヘッダー追加 | 先頭に「【ブログ更新】{記事タイトル}\n\n」を挿入 |
| 7 | フッター追加 | 末尾に「\n\n▼ 詳しくはこちら\n{記事URL}」を追加 |
| 8 | 文字数制限 | 全体を1,500文字以内に切り詰め（超過時は末尾を「...」で省略してからフッターを追加） |

#### 5.1.3 GBP 投稿 API コール

以下の JSON を GBP API の localPosts エンドポイントに POST する。

```
POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts
{
  "languageCode": "ja",
  "summary": "[変換済みテキスト]",
  "media": [
    {
      "mediaFormat": "PHOTO",
      "sourceUrl": "[抽出した画像URL]"
    }
  ],
  "callToAction": {
    "actionType": "LEARN_MORE",
    "url": "[HotPepper ブログ記事URL]"
  },
  "topicType": "STANDARD"
}
```

> **📝 注記:** localPosts に添付する画像は **URL 経由のみ**で指定可能（バイトアップロードは不可）。画像 URL は公開アクセス可能である必要がある。

#### 5.1.4 エラーハンドリング

| エラー種別 | 対応 |
|-----------|------|
| スクレイピング失敗（HTTP エラー） | リトライ3回（指数バックオフ）→ 失敗ログ記録 → 管理画面にアラート表示 |
| スクレイピング失敗（HTML 構造変更） | パースエラーをログ記録 → 管理者にメール/Slack 通知 → セレクタ修正が必要 |
| GBP API 401 Unauthorized | トークンリフレッシュ試行 → 成功時リトライ → 失敗時は gbp_connections.status を expired に変更、サロンに再認証を促す |
| GBP API 429 Rate Limit | 指数バックオフ（初回30秒、最大10分）でリトライ |
| GBP API その他エラー | リトライ3回 → 失敗ログ記録 → gbp_posts.status を failed に変更 |
| 画像 URL 無効（404等） | 画像なしで投稿（テキストのみの STANDARD 投稿） |

### 5.2 F-04: GBP OAuth 連携フロー

各サロンが自身の Google アカウントで OAuth 2.0 認証を行い、GBP との連携を確立する。

| ステップ | 処理主体 | 内容 |
|----------|----------|------|
| 1 | サロンスタッフ | 管理画面で「GBP 連携」ボタンをクリック |
| 2 | FastAPI | OAuth 認証 URL を生成し、Google の同意画面にリダイレクト |
| 3 | サロンスタッフ | 自身の Google アカウントでログインし、GBP アクセス権限を許可 |
| 4 | Google | authorization code をコールバック URL に送信 |
| 5 | FastAPI | authorization code を access_token / refresh_token に交換 |
| 6 | FastAPI | GBP API でロケーション一覧を取得し、サロンに選択画面を表示 |
| 7 | サロンスタッフ | 連携するロケーション（店舗）を選択 |
| 8 | FastAPI | トークン（AES-256-GCM 暗号化）とロケーション情報を DB に保存 |

**トークン管理:**

- access_token の有効期限は通常1時間。API コール前に期限チェックし、期限切れなら refresh_token で自動更新
- refresh_token は明示的に取り消されない限り有効。ただし Google アカウントのパスワード変更やアクセス取り消しで無効化される可能性あり
- 定期ジョブ（1日1回）で全サロンのトークン有効性を確認し、異常時は管理画面にアラート表示

### 5.3 F-05: Instagram → GBP 投稿連携（Phase 2）

#### 5.3.1 データ取得

Instagram Graph API を使用して、連携済みアカウントの最新フィード投稿を取得する。

```
GET /{ig-user-id}/media
  ?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink
  &limit=10
```

| 項目 | 内容 |
|------|------|
| 対象アカウント種別 | ビジネスアカウントまたはクリエイターアカウント |
| 取得頻度 | 4時間ごと（1日6回） |
| 新規投稿判定 | Instagram の投稿 id が source_contents に未登録のものを新規と判定 |
| 対象メディアタイプ | IMAGE → media_url を使用 / CAROUSEL_ALBUM → 先頭画像 / VIDEO → thumbnail_url を使用 |

#### 5.3.2 テキスト変換ルール

| ステップ | 処理 |
|----------|------|
| 1 | Instagram の caption をそのまま使用 |
| 2 | ハッシュタグ（#～）の除去（instagram_accounts.sync_hashtags が false の場合） |
| 3 | 1,500文字以内に切り詰め |
| 4 | 末尾に「\n\n📷 Instagram でもっと見る\n{permalink}」を追加 |

#### 5.3.3 Instagram アカウント管理

| 操作 | 内容 |
|------|------|
| アカウント追加 | 管理画面から Meta OAuth フローを開始。instagram_basic, pages_show_list 権限を要求 |
| アカウント削除 | 管理画面から連携解除。トークンを削除 |
| アカウント種別 | 「サロン公式」「スタッフ個人」のラベルを設定可能 |
| トークン管理 | 短期トークン → 長期トークン（60日）に交換。**期限30日前目安で自動リフレッシュ**（発行後24時間以降であれば随時リフレッシュ可能） |

**前提条件:**

- 全連携アカウントはビジネスまたはクリエイターアカウントである必要がある（個人アカウントは非対応）
- Facebook ページとの紐づけが必要（Instagram Graph API の仕様）
- Meta App Review で必要な権限の審査承認が必要（Phase 2 開始前に申請）

> **📝 注記:** Instagram Basic Display API は非推奨化済み。本システムでは Instagram Graph API のみを使用する。

### 5.4 F-08: ヘアスタイル画像 → GBP 写真連携（Phase 3）

| 項目 | 内容 |
|------|------|
| 取得対象 URL | `https://beauty.hotpepper.jp/slnH{salon_id}/style/` |
| 取得内容 | スタイル画像 URL、スタイル名 |
| 新規判定 | 画像 URL ベースで source_contents との差分検知 |
| GBP アップロード先 | Media API（写真セクション）、カテゴリ = ADDITIONAL |
| 対象形式 | 静止画のみ（Phase 3 初期）。動画対応は将来検討 |

```
POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/media
{
  "mediaFormat": "PHOTO",
  "locationAssociation": { "category": "ADDITIONAL" },
  "sourceUrl": "[スタイル画像URL]"
}
```

### 5.5 F-09: クーポン → GBP OFFER 投稿連携（Phase 3）

| 項目 | 内容 |
|------|------|
| 取得対象 URL | `https://beauty.hotpepper.jp/slnH{salon_id}/coupon/` |
| 取得内容 | クーポン名、条件テキスト、対象メニュー |
| GBP 投稿タイプ | OFFER（自動的に「特典を見る」ボタンが付与される） |

```
POST https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts
{
  "languageCode": "ja",
  "summary": "[クーポン名]\n[条件テキスト]",
  "offer": {
    "redeemOnlineUrl": "https://beauty.hotpepper.jp/slnH{id}/coupon/"
  },
  "topicType": "OFFER"
}
```

---

## 6. 管理画面（Web UI）仕様

### 6.1 技術選定

| 項目 | 推奨 | 理由 |
|------|------|------|
| フロントエンド | React（Vite）+ TypeScript | 高速ビルド、型安全、SPA として FastAPI と分離可能 |
| UI フレームワーク | Tailwind CSS + shadcn/ui | 高品質なコンポーネントを低コストで実装 |
| API 通信 | FastAPI の REST API を呼び出し | axios または fetch + React Query |
| 認証 | Supabase Auth クライアント SDK | @supabase/supabase-js で JWT 取得、API リクエストに付与 |

### 6.2 画面一覧

#### Phase 1（MVP）

| 画面 | パス | 対象ユーザー | 主な機能 |
|------|------|------------|----------|
| ログイン | /login | 全ユーザー | メール/パスワードによるログイン（Supabase Auth） |
| ダッシュボード | /dashboard | salon_admin, staff | 連携ステータス概要、直近の投稿一覧、エラーアラート |
| サロン設定 | /settings/salon | salon_admin | サロン名、HotPepper URL の登録・編集 |
| GBP 連携設定 | /settings/gbp | salon_admin | Google OAuth 連携フロー、ロケーション選択、連携ステータス確認 |
| 投稿履歴 | /posts | salon_admin, staff | GBP に投稿された内容の一覧、ステータス（成功/失敗）、投稿日時 |

#### Phase 2

| 画面 | パス | 主な機能 |
|------|------|----------|
| Instagram 連携設定 | /settings/instagram | Meta OAuth フロー、アカウント追加・削除・種別設定 |
| 投稿プレビュー・編集 | /posts/pending | 投稿前のテキスト・画像プレビュー、手動編集、投稿/スキップ操作 |

#### Phase 3

| 画面 | パス | 主な機能 |
|------|------|----------|
| 写真管理 | /media | GBP にアップロードされた写真の一覧・ステータス管理 |
| クーポン連携設定 | /settings/coupon | クーポン取得 ON/OFF、OFFER 投稿テンプレート設定 |
| 分析ダッシュボード | /analytics | 投稿数推移、連携成功率、エラー傾向のグラフ表示 |

#### 管理者画面（自社運営スタッフ向け）

| 画面 | パス | 主な機能 |
|------|------|----------|
| テナント管理 | /admin/salons | サロンの新規登録・停止・削除、アカウント発行 |
| 全体モニタリング | /admin/monitor | 全サロンの連携ステータス一覧、一括エラー確認 |
| ジョブ管理 | /admin/jobs | ジョブ実行ログ、手動リトライ、スケジュール調整 |
| システム設定 | /admin/settings | グローバル設定（スクレイピング間隔、通知設定等） |

---

## 7. 外部サービス連携の前提条件と制約

### 7.1 Google Business Profile API

| 項目 | 内容 |
|------|------|
| API 申請 | GBP API contact form でアクセス申請を提出。審査に**約14日**を要する |
| OAuth 同意画面 | 「外部」ユーザータイプで設定。本番環境では Google の OAuth verification 審査が必要 |
| 必要スコープ | `https://www.googleapis.com/auth/business.manage` |
| デフォルトクォータ | **300 QPM（Queries Per Minute）**。過剰リクエストは 429 エラー。サロン間でリクエストを分散させる |
| 投稿制限 | 1ロケーションあたり概ね1日10件程度が実用上の上限 |
| 投稿テキスト | プレーンテキスト、最大1,500文字 |
| ポスト画像要件 | 1200×900px（4:3）推奨、最小250×250px、JPG/PNG、5MB以下 |
| 写真セクション画像要件 | 最小250×250px、推奨720×720px 以上、JPG/PNG、10KB〜5MB |
| 動画 | 投稿（localPosts）では動画非対応。写真セクション（Media API）への動画アップロードは可能 |

**GBP API 申請手順:**

1. Google Cloud Console でプロジェクトを作成し、**プロジェクト番号（Project Number）** を確認する
2. [GBP API contact form](https://docs.google.com/forms/d/e/1FAIpQLSfC_FKSWzbSae_5rOpgwFeIUzXUF1JCQnlsZM_gC1I2UHjA3w/viewform) にアクセスし、「Application for Basic API Access」を選択
3. プロジェクト番号、ビジネス情報、API の利用目的等を記入して申請を提出
4. 審査承認を待つ（約14日）。承認状況は Google Cloud Console のクォータで確認可能（0 QPM → 未承認、300 QPM → 承認済み）
5. 承認後、Google Cloud Console で以下 **8つの API** を有効化する:
   - Google My Business API
   - My Business Account Management API
   - My Business Lodging API
   - My Business Place Actions API
   - My Business Notifications API
   - My Business Verifications API
   - My Business Business Information API
   - My Business Q&A API（※2025年11月に廃止済み。有効化不要）
6. 「APIとサービス」→「認証情報」→ OAuth 2.0 クライアント ID を作成
7. OAuth 同意画面を設定（アプリ名、スコープ、リダイレクト URI）

**参考:** https://developers.google.com/my-business/content/prereqs

### 7.2 Instagram Graph API

| 項目 | 内容 |
|------|------|
| 前提 | 連携する全アカウントがビジネスまたはクリエイターアカウントであること |
| 認証 | Meta（Facebook）OAuth 2.0。Facebook ページとの紐づけが必要 |
| アプリ審査 | Meta App Review で instagram_basic, pages_show_list, instagram_manage_insights 等の権限を申請 |
| レート制限 | 200 リクエスト / ユーザー / 時間 |
| トークン | 短期トークン（1時間）→ 長期トークン（60日）に交換。期限到来前に自動リフレッシュ |
| 取得可能データ | 自身のフィード投稿（画像URL、キャプション、メディアタイプ、パーマリンク、タイムスタンプ） |
| 取得不可データ | ストーリーズの画像URL（24時間で失効）、リールの動画URL（一部制限あり） |

### 7.3 HotPepper Beauty スクレイピング

| 項目 | 内容 |
|------|------|
| 方式 | HTTP リクエスト + HTML パース（httpx + BeautifulSoup4） |
| 法的リスク | 利用規約違反の可能性あり。法的リスクを承知の上で実施する |
| リクエスト間隔 | 最低5秒/リクエスト。サロン間の巡回を時間的に分散 |
| User-Agent | 自社アプリケーションを示す適切な User-Agent を設定 |
| robots.txt | 確認・遵守する。クロール禁止パスにはアクセスしない |
| IP ブロックリスク | 過剰アクセスで IP ブロックの可能性あり。巡回スケジュールの分散で緩和 |
| HTML 構造変更リスク | サイトリニューアルでスクレイピングが壊れる可能性あり。セレクタを設定ファイルに外出しし修正を容易にする |
| 法的確認 | 必要に応じて顧問弁護士への相談を推奨 |

---

## 8. セキュリティ要件

| カテゴリ | 項目 | 対応 |
|----------|------|------|
| 認証 | ユーザー認証 | Supabase Auth（JWT ベース）。メール + パスワード認証 |
| 認証 | API 認証 | 全 API エンドポイントで JWT 検証必須。FastAPI Dependency で実装 |
| 認可 | テナント分離 | アプリケーション層で salon_id フィルタを全クエリに自動適用 |
| 認可 | ロールベースアクセス制御 | super_admin / salon_admin / staff の3段階。エンドポイントごとに必要ロールを設定 |
| 暗号化 | 外部トークン保管 | OAuth トークンは AES-256-GCM で暗号化し DB に保存。暗号鍵は環境変数で管理 |
| 暗号化 | 通信 | HTTPS 必須（Let's Encrypt + Nginx で SSL 終端） |
| 暗号化 | DB 接続 | PostgreSQL への接続は SSL モードを使用 |
| 監査 | 操作ログ | 投稿操作・認証操作・設定変更のアクセスログを90日間保持 |
| 監査 | ジョブログ | 全ジョブの実行結果を job_logs テーブルに記録 |
| インフラ | コンテナセキュリティ | Docker イメージの定期更新。非 root ユーザーでコンテナ実行 |
| インフラ | 依存関係 | Python パッケージの脆弱性監査（pip-audit / safety） |
| インフラ | シークレット管理 | Docker Compose の環境変数ファイル（.env）で管理。Git に含めない |

---

## 9. 非機能要件

| 項目 | 要件 | 備考 |
|------|------|------|
| 可用性 | 99%以上（月間ダウンタイム約7時間まで許容） | VPS 単体構成のため、冗長化は将来検討 |
| レスポンス | 管理画面の画面遷移は3秒以内 | API レスポンスは500ms以内を目標 |
| スケーラビリティ | 初期: 10〜50サロン → 将来: 100〜300サロン | サロン数増加に応じて Worker 数・VPS スペックを段階的にスケール |
| バックアップ | PostgreSQL の日次バックアップ | pg_dump による自動バックアップ + 外部ストレージへの転送（7日分保持） |
| 監視・通知 | ジョブ実行ログ、エラーアラート | 失敗ジョブはメールまたは Slack で運営チームに通知 |
| メンテナンス | スクレイピング対象の HTML 構造変更に対する定期点検 | 月1回のセレクタ動作確認を推奨 |
| ログ保持 | アプリケーションログ: 30日、ジョブログ: 90日、投稿履歴: 無期限 | ディスク容量に応じて調整 |

---

## 10. 開発ロードマップ

| フェーズ | 期間目安 | 主要成果物 | ブロッカー |
|----------|---------|-----------|-----------|
| Phase 0: 環境構築 | 2〜4週間 | GBP API 審査申請、Docker 環境、DB セットアップ、Supabase Auth 統合 | GBP API 審査（並行作業可） |
| Phase 1: MVP | 6〜8週間 | F-01〜F-04（認証、ブログ→GBP 連携、基本管理画面） | GBP API 審査承認 |
| Phase 2: Instagram | 4〜6週間 | F-05〜F-07（Instagram 連携、アカウント管理、プレビュー機能） | Meta App Review 承認 |
| Phase 3: 拡張 | 4〜6週間 | F-08〜F-10（写真連携、クーポン連携、分析ダッシュボード） | なし |

**合計: 約16〜24週間（4〜6ヶ月）**

**並行作業の推奨:**

- Phase 0 で GBP API 審査を即座に申請し、審査待ちの間に Phase 1 のスクレイピング・管理画面部分を並行開発する
- Phase 1 終盤で Meta App Review を申請し、Phase 2 開始時には承認済みの状態を目指す

---

## 11. リスクと対策

| リスク | 影響度 | 発生可能性 | 対策 |
|--------|--------|-----------|------|
| GBP API 審査が通らない | 致命的 | 低〜中 | 早期に申請開始。申請理由にビジネス管理用 SaaS であることを明記。リジェクト時は再申請理由を改善 |
| HotPepper サイト構造変更 | 高 | 中 | スクレイピングのセレクタを設定ファイルで外出し。構造変更の自動検知アラートを実装。月次で動作確認 |
| HotPepper からの IP ブロック | 中 | 中 | リクエスト間隔の遵守（5秒以上）。巡回時間帯の分散。VPS の IP 変更が可能な構成を検討 |
| Instagram API 仕様変更 | 中 | 低 | Meta の変更通知（90日前告知）を監視。Graph API バージョンを明示的に指定し、非推奨警告をログ監視 |
| **Instagram 権限体系の変更** | 中 | 低〜中 | **instagram_basic 等の権限が将来非推奨化される可能性あり。Meta の開発者向けアナウンスを定期的に監視し、権限移行に備える** |
| トークン失効によるサイレント障害 | 中 | 中 | トークン有効期限の日次監視ジョブ。失効時は管理画面アラート＋メール通知で即座にサロンに通知 |
| VPS リソース不足 | 低〜中 | 低 | サロン数に応じた段階的スペックアップ。Worker の並列数を設定で調整可能に設計 |
| Supabase Auth 障害 | 中 | 低 | Supabase のステータスページを監視。JWT はローカル検証可能なため、認証済みセッションは Auth 障害中も維持 |

---

## 12. 今後の確認・決定事項

| # | 項目 | 状態 | 優先度 | 備考 |
|---|------|------|--------|------|
| 1 | GBP API 利用申請の実施 | 未着手 | 最高 | Phase 0 で最優先。審査に約14日かかるため即座に着手 |
| 2 | Meta（Instagram）App Review 申請 | 未着手 | 高 | Phase 2 開始前に申請。Phase 1 終盤で着手 |
| 3 | HotPepper Beauty ブログの RSS 有無確認 | 未確認 | 高 | RSS が使えればスクレイピング範囲を縮小しリスク軽減可能 |
| 4 | フロントエンド技術の最終決定 | 推奨済 | 中 | React（Vite）+ TypeScript を推奨 |
| 5 | VPS スペックの決定 | 未確定 | 中 | 初期サロン数に応じて選定（2vCPU / 4GB RAM 以上を推奨） |
| 6 | ドメイン・SSL 証明書の手配 | 未着手 | 中 | 管理画面のドメインを決定し、DNS 設定と Let's Encrypt の証明書取得 |
| 7 | 管理画面のワイヤーフレーム作成 | 未着手 | 中 | Phase 1 開発開始前にデザイン着手 |
| 8 | HotPepper スクレイピングの法的確認 | 推奨 | 高 | 必要に応じて顧問弁護士への相談を推奨 |
| 9 | Supabase プラン選定 | 未確定 | 中 | Free プランで開始可能。MAU に応じて Pro プランへの移行を検討 |
| 10 | バックアップ先ストレージの選定 | 未確定 | 低 | S3 互換ストレージ等を検討 |

---

## 付録

### 付録 A: 用語集

| 用語 | 説明 |
|------|------|
| GBP | Google Business Profile（Google ビジネスプロフィール） |
| localPost | GBP API における投稿オブジェクト。STANDARD / OFFER / EVENT の3種類 |
| STANDARD | GBP の「最新情報（What's New）」投稿タイプ |
| OFFER | GBP の「クーポン/オファー」投稿タイプ |
| Instagram Graph API | Meta が提供する Instagram のビジネス向け API |
| Supabase Auth | オープンソースの認証サービス。JWT ベースの認証を提供 |
| Celery | Python の分散タスクキュー。非同期ジョブ・定期ジョブの実行に使用 |
| Celery Beat | Celery の定期ジョブスケジューラ |
| テナント | 本システムにおける各サロンのこと |
| salon_id | テナントを識別する UUID。全テーブルに付与してデータ分離に使用 |

### 付録 B: HotPepper Beauty URL 構造

```
ブログ一覧:   https://beauty.hotpepper.jp/slnH{salon_id}/blog/
ブログ記事:   https://beauty.hotpepper.jp/slnH{salon_id}/blog/bid{article_id}.html
スタイル一覧: https://beauty.hotpepper.jp/slnH{salon_id}/style/
クーポン一覧: https://beauty.hotpepper.jp/slnH{salon_id}/coupon/
```

### 付録 C: GBP API エンドポイント一覧

| 用途 | メソッド | エンドポイント |
|------|---------|---------------|
| 投稿作成 | POST | `https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts` |
| 投稿一覧 | GET | `https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts` |
| 投稿更新 | PATCH | `https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts/{postId}` |
| 投稿削除 | DELETE | `https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/localPosts/{postId}` |
| 写真アップロード | POST | `https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/media` |
| 写真一覧 | GET | `https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/media` |
| ロケーション一覧 | GET | `https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations` |
| トークン取得 | POST | `https://oauth2.googleapis.com/token` |

### 付録 D: Docker Compose 構成例

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: [./nginx/conf.d:/etc/nginx/conf.d, ./certbot:/etc/letsencrypt]
    depends_on: [api]

  api:
    build: ./app
    command: uvicorn main:app --host 0.0.0.0 --port 8000
    env_file: .env
    depends_on: [db, redis]

  worker:
    build: ./app
    command: celery -A tasks worker --loglevel=info --concurrency=2
    env_file: .env
    depends_on: [db, redis]

  beat:
    build: ./app
    command: celery -A tasks beat --loglevel=info
    env_file: .env
    depends_on: [redis]

  db:
    image: postgres:16-alpine
    volumes: [postgres_data:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: salon_gbp
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```
