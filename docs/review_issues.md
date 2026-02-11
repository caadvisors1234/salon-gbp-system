# コードレビュー指摘事項一覧

> 2026-02-10 実施 — リポジトリ全体の包括的レビューに基づく

## 凡例

- **優先度**: P0(即時対応）/ P1（本番前必須）/ P2（短期）/ P3（中長期）
- **分類**: Security / Quality / Testing / Infra / Docs / Performance
- **状態**: `[ ]` 未着手 / `[x]` 完了

---

## P0: 即時対応（本番デプロイをブロックする問題）

### INFRA-001: フロントエンドが Vite 開発サーバーで動作している
- **分類**: Infra
- **状態**: `[x]`
- **場所**: `deploy/docker-compose.yml` L48-58
- **内容**: `npm run dev` で Vite dev server を起動しており、本番利用不可。HMR用WebSocket設定もdev前提。
- **対応**: `frontend/Dockerfile` をマルチステージビルドで作成し、`npm run build` → Nginx で静的配信に変更する。
- **リスク**: パフォーマンス劣化、メモリリーク、ソースマップ露出

### INFRA-002: CI/CD パイプラインが存在しない
- **分類**: Infra
- **状態**: `[x]`
- **場所**: `.github/workflows/` が存在しない
- **内容**: 自動テスト、リント、ビルド検証、デプロイが一切自動化されていない。
- **対応**: GitHub Actions を構築。Backend: pytest + ruff + mypy、Frontend: tsc + vitest + build、Docker: イメージビルド検証。

### SEC-001: Nginx にセキュリティヘッダーが未設定
- **分類**: Security
- **状態**: `[x]`
- **場所**: `deploy/nginx/conf.d/default.conf`
- **内容**: 以下のヘッダーがすべて欠落:
  - `X-Frame-Options` (クリックジャッキング防止)
  - `X-Content-Type-Options` (MIME スニッフィング防止)
  - `Content-Security-Policy` (XSS 防止)
  - `Strict-Transport-Security` (HTTPS 強制)
  - `Referrer-Policy`
- **対応**: 全 location ブロックに以下を追加:
  ```nginx
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;
  ```

---

## P1: 本番前必須（リリースまでに解決すべき問題）

### TEST-001: API ルートの統合テストがゼロ
- **分類**: Testing
- **状態**: `[ ]`
- **場所**: `backend/tests/`
- **内容**: FastAPI ルートハンドラの統合テストが存在しない。認証・認可フロー、ステータスコード、レスポンス形式が未検証。
- **対応**: `TestClient` を使用した統合テストを主要エンドポイントに追加。最低限 `/api/health`, `/api/me`, `/api/posts`, `/api/admin/*` をカバー。

### SEC-002: ステータス・ロールが文字列ベースで型安全でない
- **分類**: Security / Quality
- **状態**: `[ ]`
- **場所**: `backend/app/api/deps.py` L35, `backend/app/api/routes/admin.py` L28, `backend/app/worker/tasks.py` 複数箇所
- **内容**: ロール (`"staff"`, `"salon_admin"`, `"super_admin"`) やステータス (`"pending"`, `"posted"`, `"failed"`) がマジックストリングとしてハードコードされている。タイポや不正値の検出が不可能。
- **対応**: Python `Enum` または `Literal` 型を導入し、Pydantic スキーマとDB制約に反映。
  ```python
  class UserRole(str, Enum):
      STAFF = "staff"
      SALON_ADMIN = "salon_admin"
      SUPER_ADMIN = "super_admin"
  ```

### INFRA-003: Docker Compose にヘルスチェック・再起動ポリシーがない
- **分類**: Infra
- **状態**: `[x]`
- **場所**: `deploy/docker-compose.yml`
- **内容**: 全サービスに `healthcheck` と `restart` ディレクティブがない。コンテナがサイレントに失敗しても再起動されない。
- **対応**: 全サービスに追加:
  ```yaml
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  ```

### INFRA-004: DB パスワードが docker-compose.yml にハードコード
- **分類**: Security / Infra
- **状態**: `[x]`
- **場所**: `deploy/docker-compose.yml` L62-65
- **内容**: `POSTGRES_PASSWORD: salon_gbp` がプレーンテキストで記載。
- **対応**: `${POSTGRES_PASSWORD}` に変更し `.env` から読み込む。

### SEC-003: Dockerfile に ca-certificates がない
- **分類**: Security
- **状態**: `[x]`
- **場所**: `backend/Dockerfile` L8-10
- **内容**: `ca-certificates` パッケージ未インストール。OAuth フロー（Google, Meta）のTLS検証が失敗する可能性。
- **対応**: apt-get に `ca-certificates` を追加:
  ```dockerfile
  RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
  ```

### QUAL-001: 起動時の設定値バリデーションがない
- **分類**: Quality
- **状態**: `[ ]`
- **場所**: `backend/app/core/config.py`
- **内容**: `TOKEN_ENC_KEY_B64`, `OAUTH_STATE_SECRET` 等の必須シークレットが未設定でも起動できてしまう。最初のAPI呼び出し時にクラッシュ。
- **対応**: Pydantic v2 の `@model_validator` で起動時に検証:
  ```python
  @model_validator(mode="after")
  def validate_required_secrets(self) -> Self:
      if self.app_env != "dev" and not self.token_enc_key_b64:
          raise ValueError("TOKEN_ENC_KEY_B64 is required in non-dev environments")
      return self
  ```

---

## P2: 短期改善（リリース後1-2スプリント以内）

### QUAL-002: bare except（汎用例外キャッチ）の改善
- **分類**: Quality
- **状態**: `[ ]`
- **場所**:
  - `backend/app/worker/tasks.py` L117, L130, L169 (`except Exception` + `# noqa: BLE001`)
  - `backend/app/api/routes/oauth_google.py` L65
  - `backend/app/api/routes/gbp.py` L69-77（例外を無視して空リスト返却）
- **内容**: 汎用的な例外キャッチにより、予期しないエラーが隠蔽される。
- **対応**: 具体的な例外型（`httpx.HTTPError`, `ValueError` 等）でキャッチし、未知の例外はログ出力後にリレイズ。

### QUAL-003: スクレイパータスクの競合状態（Race Condition）
- **分類**: Quality
- **状態**: `[ ]`
- **場所**: `backend/app/worker/tasks.py` L216-224
- **内容**: 2つの同時実行スクレイパータスクが同じ `SourceContent` を作成しようとする可能性。ユニーク制約で DB 破損は防止されるが、無駄なレコード・エラーが発生。
- **対応**: `INSERT ... ON CONFLICT DO NOTHING` または悲観的ロックを使用:
  ```python
  stmt = insert(SourceContent).values(...).on_conflict_do_nothing(
      index_elements=["salon_id", "source_type", "source_id"]
  )
  ```

### QUAL-004: GBP トークンリフレッシュのリトライがない
- **分類**: Quality
- **状態**: `[ ]`
- **場所**: `backend/app/services/gbp_tokens.py` L16-30
- **内容**: トークンリフレッシュ失敗時にタスクが即座にクラッシュする。ネットワーク一時障害で回復不能。
- **対応**: 指数バックオフ付きリトライを実装（最大3回、間隔: 2s/4s/8s）。

### DB-001: 複合インデックスの追加
- **分類**: Performance
- **状態**: `[ ]`
- **場所**: `backend/alembic/versions/0001_init.py`
- **内容**:
  - `gbp_posts`: `(status, created_at)` の複合インデックスなし（リスト表示クエリで使用）
  - `job_logs`: `status` カラムにインデックスなし（監視クエリで使用）
- **対応**: Alembic マイグレーションで追加:
  ```python
  op.create_index("ix_gbp_posts_status_created", "gbp_posts", ["status", "created_at"])
  op.create_index("ix_job_logs_status", "job_logs", ["status"])
  ```

### INFRA-005: Docker Compose にリソース制限がない
- **分類**: Infra
- **状態**: `[x]`
- **場所**: `deploy/docker-compose.yml`
- **内容**: CPU/メモリ制限未設定。暴走コンテナがホストリソースを枯渇させるリスク。
- **対応**: 各サービスに `deploy.resources.limits` を追加:
  ```yaml
  deploy:
    resources:
      limits:
        cpus: "1.0"
        memory: 512M
  ```

### INFRA-006: Celery ワーカーの `max-tasks-per-child` 未設定
- **分類**: Infra / Performance
- **状態**: `[x]`
- **場所**: `deploy/docker-compose.yml` (worker コマンド)
- **内容**: Celery ワーカーがタスク処理でメモリリークした場合、プロセスが再起動されない。
- **対応**: コマンドに `--max-tasks-per-child=100` を追加。

### INFRA-007: Nginx で gzip 圧縮が未有効
- **分類**: Performance
- **状態**: `[x]`
- **場所**: `deploy/nginx/conf.d/default.conf`
- **内容**: API レスポンスや静的ファイルの gzip 圧縮がない。帯域使用量増加。
- **対応**: nginx.conf に追加:
  ```nginx
  gzip on;
  gzip_types application/json text/css application/javascript image/svg+xml;
  gzip_min_length 256;
  ```

### TEST-002: フロントエンドの未テストページ追加
- **分類**: Testing
- **状態**: `[ ]`
- **場所**: `frontend/src/pages/__tests__/`
- **内容**: 以下のページにテストがない:
  - `AdminUsersPage`
  - `AdminJobLogsPage`
  - `AdminMonitorPage`
  - `InstagramSettingsPage`
  - `MediaUploadsPage`
  - `AlertsPage`
  - `SalonSettingsPage`
- **対応**: 最低限のレンダリング・データ表示テストを追加。

### SEC-004: Admin ユーザー招待がメール検証なし
- **分類**: Security
- **状態**: `[ ]`
- **場所**: `backend/app/api/routes/admin.py` L82-86
- **内容**: Supabase ユーザー作成時に `email_confirm: true` で自動確認。メールアドレスの誤入力時にユーザーがロックアウトされる。
- **対応**: 検証メール送信を行うか、管理者が手動確認できるUIを追加。

### QUAL-005: フロントエンドの `PostDetailPage` が大きすぎる
- **分類**: Quality
- **状態**: `[ ]`
- **場所**: `frontend/src/pages/PostDetailPage.tsx` (258行)
- **内容**: フォーム、バリデーション、メタデータ表示、承認ロジックが1ファイルに集中。
- **対応**: 以下のコンポーネントに分割:
  - `PostTextEditor` (テキスト編集セクション)
  - `PostMetadata` (メタデータ表示)
  - フォームバリデーションロジックをカスタムフックに抽出

---

## P3: 中長期改善（ロードマップに組み込む）

### SEC-005: API レートリミットの導入
- **分類**: Security
- **状態**: `[ ]`
- **場所**: `deploy/nginx/conf.d/default.conf` または `backend/app/`
- **内容**: API エンドポイントにレートリミットがない。DDoS やブルートフォースのリスク。
- **対応**: Nginx の `limit_req_zone` を設定するか、FastAPI ミドルウェアで実装。

### SEC-006: OAuth state パラメータの暗号化
- **分類**: Security
- **状態**: `[ ]`
- **場所**: `backend/app/core/oauth_state.py`
- **内容**: state パラメータは HMAC 署名されているが暗号化されていない。`salon_id` と `user_id` がブラウザ履歴やログに露出。
- **対応**: `Fernet` 等で暗号化するか、ランダムトークン + サーバーサイドセッション方式に変更。

### INFRA-008: 監視・メトリクス基盤の構築
- **分類**: Infra
- **状態**: `[ ]`
- **内容**: APM、メトリクス収集、ログ集約が未整備。障害検知が手動。
- **対応**: Sentry（エラー追跡）、Prometheus + Grafana（メトリクス）、集中ログ（Loki or ELK）の導入を検討。

### INFRA-009: HTTPS/TLS 終端の構成
- **分類**: Security / Infra
- **状態**: `[ ]`
- **場所**: `deploy/nginx/conf.d/default.conf`
- **内容**: 現在 HTTP のみ。本番では全通信を暗号化する必要あり。
- **対応**: Let's Encrypt + certbot、またはCloudFlare等のCDN経由でTLS終端。

### QUAL-006: リクエストトレーシング（相関ID）の導入
- **分類**: Quality
- **状態**: `[ ]`
- **場所**: `backend/app/core/logging.py`
- **内容**: JSON ログにリクエストIDがなく、APIリクエスト→Celeryタスクの追跡が困難。
- **対応**: FastAPI ミドルウェアで `X-Request-ID` を生成し、ログとCeleryタスクに伝播。

### QUAL-007: Celery サーキットブレーカーの導入
- **分類**: Quality
- **状態**: `[ ]`
- **場所**: `backend/app/worker/tasks.py`
- **内容**: 外部API（Google GBP, HotPepper, Instagram）が連続障害中でもタスクを投げ続ける。
- **対応**: `pybreaker` 等でサーキットブレーカーを実装。連続N回失敗でオープン状態に遷移し、一定時間タスクをスキップ。

### DB-002: 監査トレイル（変更履歴）の実装
- **分類**: Quality
- **状態**: `[ ]`
- **場所**: `backend/app/models/`
- **内容**: 投稿の編集・承認・却下の変更履歴が追跡されない。`job_logs` はタスク実行ログのみ。
- **対応**: `post_history` テーブルを追加し、ステータス変更・テキスト編集をトラック。

### DB-003: ソフトデリートの検討
- **分類**: Quality
- **状態**: `[ ]`
- **場所**: `backend/app/models/`
- **内容**: 現在すべて物理削除（CASCADE）。誤削除時のリカバリ不可。
- **対応**: 主要テーブルに `deleted_at` カラムを追加し、クエリフィルタを適用。

### TEST-003: E2E テストの導入
- **分類**: Testing
- **状態**: `[ ]`
- **内容**: End-to-End テストがゼロ。ログイン→投稿一覧→承認→公開の一連フローが未検証。
- **対応**: Playwright を導入し、主要ユーザーフロー（ログイン、投稿管理、設定変更）をカバー。

### TEST-004: スクレイパーの実 HTML テスト追加
- **分類**: Testing
- **状態**: `[ ]`
- **場所**: `backend/tests/test_scrapers.py`
- **内容**: モックのみでテスト。実際のHTML構造変更を検知できない。
- **対応**: 実HTMLスナップショットを `tests/fixtures/` に保存し、パーサーの回帰テストを追加。

### QUAL-008: スクレイパーのセレクタ YAML スキーマ検証
- **分類**: Quality
- **状態**: `[ ]`
- **場所**: `backend/app/scrapers/selector_loader.py`
- **内容**: YAML ファイルのスキーマ検証がなく、不正なセレクタ定義でもサイレントに動作。
- **対応**: Pydantic モデルまたは JSON Schema で YAML 構造を検証。

### DOCS-001: README.md の作成
- **分類**: Docs
- **状態**: `[ ]`
- **内容**: `CLAUDE.md` が事実上のドキュメントだが、人間向け README がない。
- **対応**: プロジェクト概要、セットアップ手順、アーキテクチャ図を含む README.md を作成。

### DOCS-002: インシデント対応手順書の作成
- **分類**: Docs
- **状態**: `[ ]`
- **内容**: 障害発生時のフェイルオーバー、DB リストア、ロールバック手順が文書化されていない。
- **対応**: `docs/ops_runbook.md` に追記、または専用の `docs/incident_response.md` を作成。

---

## サマリー

| 優先度 | 件数 | 内訳 |
|--------|------|------|
| **P0** (即時) | 3 | INFRA-001, INFRA-002, SEC-001 |
| **P1** (本番前) | 6 | TEST-001, SEC-002, INFRA-003, INFRA-004, SEC-003, QUAL-001 |
| **P2** (短期) | 10 | QUAL-002〜005, DB-001, INFRA-005〜007, TEST-002, SEC-004 |
| **P3** (中長期) | 12 | SEC-005〜006, INFRA-008〜009, QUAL-006〜008, DB-002〜003, TEST-003〜004, DOCS-001〜002 |
| **合計** | **31** | |

### カテゴリ別

| 分類 | 件数 |
|------|------|
| Security | 7 |
| Quality | 9 |
| Testing | 4 |
| Infra | 9 |
| Performance | (DB-001, INFRA-006, INFRA-007 に含む) |
| Docs | 2 |
