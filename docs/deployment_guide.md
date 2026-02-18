# VPS デプロイメントガイド

salon-gbp-system を VPS (既存 Nginx Proxy Manager 環境) にデプロイする手順書。

## 前提条件

- Docker Engine 24+
- Docker Compose v2
- 外部 Docker ネットワーク `app-network` が作成済み
- DNS: `salon-gbp.ai-beauty.tokyo` が VPS の IP に向いている
- Nginx Proxy Manager (NPM) が `/opt/gateway/` で稼働中

---

## 1. 初回セットアップ

### 1.1. リポジトリのクローン

```bash
cd /opt
git clone <repo-url> salon-gbp
cd salon-gbp
```

### 1.2. 環境変数の設定

まず安全なパスワード・鍵を生成する:

```bash
# PostgreSQL パスワード
echo "POSTGRES_PASSWORD: $(openssl rand -base64 24)"

# AES-256 暗号化鍵 (32バイト)
echo "TOKEN_ENC_KEY_B64: $(python3 -c 'import os,base64;print(base64.urlsafe_b64encode(os.urandom(32)).decode())')"

# OAuth HMAC 署名鍵
echo "OAUTH_STATE_SECRET: $(openssl rand -base64 32)"
```

`.env.example` をコピーして本番値で編集:

```bash
cp .env.example .env
vi .env
```

`.env` に設定する本番値:

```bash
# General
APP_ENV=production
APP_PUBLIC_BASE_URL=https://salon-gbp.ai-beauty.tokyo

# Backend
API_CORS_ORIGINS=["https://salon-gbp.ai-beauty.tokyo"]
DATABASE_URL=postgresql+psycopg://salon_gbp:<生成したパスワード>@db:5432/salon_gbp
REDIS_URL=redis://redis:6379/0

# PostgreSQL (docker-compose.prod.yml が参照)
# POSTGRES_PASSWORD は必須。未設定だとコンテナ起動時にエラーになる。
# DATABASE_URL 内のパスワードと必ず同じ値にすること。
POSTGRES_PASSWORD=<生成したパスワード>

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_JWKS_URL=https://xxxxx.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_SECRET=<Supabase Dashboard から取得>
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Token encryption (上で生成した値)
TOKEN_ENC_KEY_B64=<生成した値>

# OAuth state signing (上で生成した値)
OAUTH_STATE_SECRET=<生成した値>

# Google OAuth / GBP
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://salon-gbp.ai-beauty.tokyo/api/oauth/google/callback
GOOGLE_OAUTH_SCOPES=https://www.googleapis.com/auth/business.manage openid email

# Meta / Instagram
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://salon-gbp.ai-beauty.tokyo/api/oauth/meta/callback
META_OAUTH_SCOPES=instagram_basic,pages_show_list

# Media
MEDIA_ROOT=/data/media
MEDIA_PUBLIC_PATH=/media
MEDIA_RETENTION_DAYS=30

# Scraper
SCRAPER_USER_AGENT=SalonGBPSystem/0.1
```

> **注意**: パスワードに `@`, `/`, `%` 等の特殊文字が含まれる場合、`DATABASE_URL` 内ではURLエンコードが必要。

### 1.3. コンテナのビルドと起動

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d --build
```

### 1.4. データベースマイグレーション

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml exec api alembic upgrade head
```

### 1.5. ヘルスチェック確認

```bash
# 全コンテナのステータス確認 (全て "healthy" であること)
docker compose --env-file .env -f deploy/docker-compose.prod.yml ps

# API ヘルスチェック
docker exec salon_gbp_api curl -f http://localhost:8000/api/health

# Web (nginx) ヘルスチェック
# 注意: Alpine Linux では localhost が IPv6 (::1) に解決されるため 127.0.0.1 を使用
docker exec salon_gbp_web wget -qO- http://127.0.0.1:8000/healthz

# ドメイン経由の疎通確認 (NPM 設定後)
curl -s -o /dev/null -w "%{http_code}" https://salon-gbp.ai-beauty.tokyo/api/health
curl -s -o /dev/null -w "%{http_code}" https://salon-gbp.ai-beauty.tokyo/
```

---

## 2. NPM Gateway 設定

### 2.1. ネットワーク確認

`salon_gbp_web` コンテナは外部ネットワーク `app-network` に参加しています。
Gateway は既に他のアプリ用に `app-network` に参加しているため、追加のネットワーク接続は不要です。

```bash
# Gateway が app-network に参加しているか確認
docker network inspect app-network --format '{{range .Containers}}{{.Name}} {{end}}' | grep gateway
```

> **注意**: Gateway を内部ネットワーク (`salon-gbp_internal`) に接続しないでください。
> 内部ネットワークには db, redis 等が含まれており、不要なアクセス経路を作ることになります。

### 2.2. Proxy Host 追加

NPM 管理画面 (ポート 81) で以下を設定:

| 項目 | 値 |
|------|-----|
| Domain Names | `salon-gbp.ai-beauty.tokyo` |
| Scheme | `http` |
| Forward Hostname | `salon_gbp_web` |
| Forward Port | `8000` |
| Block Common Exploits | Enable |
| Websockets Support | Enable |

### 2.3. SSL 設定

SSL タブで:
- **SSL Certificate**: Request a new SSL Certificate
- **Force SSL**: Enable
- **HSTS Enabled**: Enable
- **HTTP/2 Support**: Enable

---

## 3. 更新デプロイ

```bash
cd /opt/salon-gbp

# 最新コードを取得
git pull origin master

# コンテナを再ビルドして起動
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d --build

# マイグレーション (新しいマイグレーションがある場合)
docker compose --env-file .env -f deploy/docker-compose.prod.yml exec api alembic upgrade head

# 全コンテナが healthy であることを確認
docker compose --env-file .env -f deploy/docker-compose.prod.yml ps
```

### 特定サービスだけ再ビルド

フロントエンドのみ変更した場合など:

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d --build web
```

バックエンドのみ変更した場合:

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d --build api worker beat
docker compose --env-file .env -f deploy/docker-compose.prod.yml exec api alembic upgrade head
```

---

## 4. 運用コマンド

### ログ確認

```bash
# 全サービス
docker compose --env-file .env -f deploy/docker-compose.prod.yml logs -f --tail 100

# 特定サービス
docker compose --env-file .env -f deploy/docker-compose.prod.yml logs -f api
docker compose --env-file .env -f deploy/docker-compose.prod.yml logs -f worker
```

### コンテナステータス

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml ps
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

### サービス再起動

```bash
# 特定サービスのみ
docker compose --env-file .env -f deploy/docker-compose.prod.yml restart api

# 全サービス
docker compose --env-file .env -f deploy/docker-compose.prod.yml restart
```

---

## 5. データベースバックアップ

### バックアップ作成

```bash
docker exec salon_gbp_db pg_dump -U salon_gbp salon_gbp | gzip > /opt/salon-gbp/backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### バックアップからリストア

```bash
# 1. アプリケーションサービスを停止 (DB接続を切断)
docker compose --env-file .env -f deploy/docker-compose.prod.yml stop api worker beat

# 2. 既存データベースを削除して再作成 (-d postgres でメンテナンスDBに接続)
docker exec -i salon_gbp_db psql -U salon_gbp -d postgres -c "DROP DATABASE IF EXISTS salon_gbp;"
docker exec -i salon_gbp_db psql -U salon_gbp -d postgres -c "CREATE DATABASE salon_gbp;"

# 3. リストア
gunzip -c backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i salon_gbp_db psql -U salon_gbp salon_gbp

# 4. サービスを再起動
docker compose --env-file .env -f deploy/docker-compose.prod.yml start api worker beat
```

---

## 6. ロールバック

```bash
cd /opt/salon-gbp

# 直前のコミットに戻す
git log --oneline -5    # コミットハッシュを確認
git checkout <commit-hash>

# 再ビルド
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d --build

# マイグレーションのダウングレード (必要な場合)
docker compose --env-file .env -f deploy/docker-compose.prod.yml exec api alembic downgrade -1
```

---

## 7. リソース構成

| サービス | CPU | メモリ | 用途 |
|----------|-----|--------|------|
| web | 0.25 | 128M | nginx + SPA 配信 |
| api | 0.5 | 512M | FastAPI |
| worker | 0.5 | 512M | Celery ワーカー (concurrency=2) |
| beat | 0.25 | 256M | Celery Beat スケジューラ |
| db | 0.5 | 512M | PostgreSQL 16 |
| redis | 0.25 | 192M | Redis 7 (Celery ブローカー) |
| **合計** | **2.25** | **2.1GB** | |

---

## 8. トラブルシューティング

### 502 Bad Gateway

1. コンテナが起動しているか確認: `docker compose --env-file .env -f deploy/docker-compose.prod.yml ps`
2. Gateway から名前解決できるか確認: `docker exec gateway-app-1 ping salon_gbp_web`
3. ネットワーク接続を確認: `docker network inspect app-network`

### コンテナが再起動を繰り返す

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml logs api --tail 50
```

よくある原因:
- `.env` の `DATABASE_URL` と `POSTGRES_PASSWORD` が不一致
- `TOKEN_ENC_KEY_B64` や `OAUTH_STATE_SECRET` が未設定
- PostgreSQL がまだ起動完了していない (healthcheck の start_period を確認)

### フロントエンドが表示されない

1. web コンテナに入って静的ファイルを確認:
   ```bash
   docker exec salon_gbp_web ls /usr/share/nginx/html/
   ```
2. `index.html` と `assets/` ディレクトリが存在することを確認
3. ビルド時の環境変数を確認 (VITE_SUPABASE_URL 等)

### web コンテナが unhealthy になる

Alpine Linux では `localhost` が IPv6 (`::1`) に解決されるが、nginx は IPv4 のみでリッスンしている。
ヘルスチェックが `http://localhost:8000/healthz` を使っている場合は `http://127.0.0.1:8000/healthz` に変更する。

```bash
# 確認方法
docker exec salon_gbp_web wget -qO- http://127.0.0.1:8000/healthz  # → ok
docker exec salon_gbp_web wget -qO- http://localhost:8000/healthz   # → Connection refused
```

### Google OAuth コールバックが失敗する

- `GOOGLE_REDIRECT_URI` が本番ドメイン (`https://salon-gbp.ai-beauty.tokyo/api/oauth/google/callback`) になっているか確認
- Google Cloud Console の「承認済みのリダイレクト URI」に本番URLが登録されているか確認

---

## 9. アーキテクチャ図

```
[Internet]
    │
    ▼
[NPM Gateway] (SSL終端, app-network)
    │
    ▼
[salon_gbp_web :8000] (nginx: SPA配信 + リバースプロキシ)
    ├── /         → SPA (ビルド済み静的ファイル)
    ├── /api/     → salon_gbp_api:8000 (FastAPI)
    ├── /media/   → /data/media (共有Volume, 読み取り専用)
    └── /assets/  → ビルド済みアセット (長期キャッシュ)

[salon_gbp_api]    ← FastAPI + uvicorn
[salon_gbp_worker] ← Celery worker (concurrency=2)
[salon_gbp_beat]   ← Celery Beat (定期タスクスケジューラ)
[salon_gbp_db]     ← PostgreSQL 16
[salon_gbp_redis]  ← Redis 7 (Celery ブローカー)

ネットワーク:
  - app-network (外部): NPM ↔ web の通信
  - internal (内部):    web ↔ api ↔ db/redis の通信
```

---

## 10. Google OAuth リダイレクトURI の更新

本番デプロイ後、Google Cloud Console でリダイレクトURIを更新する必要がある:

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. **API とサービス** → **認証情報** → OAuth 2.0 クライアント ID を選択
3. **承認済みのリダイレクト URI** に追加:
   - `https://salon-gbp.ai-beauty.tokyo/api/oauth/google/callback`
4. 保存
