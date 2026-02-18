# 運用手順（Runbook）

本番VPS (`salon-gbp.ai-beauty.tokyo`) の運用手順書。

> **共通プレフィックス**: 本番環境のコマンドは全て以下のプレフィックスが必要:
> ```
> docker compose --env-file .env -f deploy/docker-compose.prod.yml
> ```
> 以降、これを `dc` と略記する。必要に応じてエイリアスを設定:
> ```bash
> alias dc='docker compose --env-file .env -f deploy/docker-compose.prod.yml'
> ```

---

## 1. 日常運用

### サービス状態の確認

```bash
cd /opt/salon-gbp

# 全コンテナのステータス (全て healthy であること)
dc ps

# リソース使用状況
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
```

### ログの確認

```bash
# 全サービスの最新ログ
dc logs --tail 100

# リアルタイムでフォロー
dc logs -f api worker

# 特定サービスのログ
dc logs --tail 200 api       # API サーバー
dc logs --tail 200 worker    # Celery ワーカー (スクレイピング、GBP投稿)
dc logs --tail 200 beat      # Celery Beat (スケジューラ)
dc logs --tail 200 web       # nginx (リバースプロキシ)
dc logs --tail 200 db        # PostgreSQL
```

### ヘルスチェック

```bash
# コンテナ内部
docker exec salon_gbp_api curl -f http://localhost:8000/api/health
docker exec salon_gbp_web wget -qO- http://127.0.0.1:8000/healthz

# 外部からドメイン経由
curl -s -o /dev/null -w "%{http_code}" https://salon-gbp.ai-beauty.tokyo/api/health
curl -s -o /dev/null -w "%{http_code}" https://salon-gbp.ai-beauty.tokyo/
```

---

## 2. 更新デプロイ

```bash
cd /opt/salon-gbp

# 1. 最新コードを取得
git pull origin master

# 2. コンテナを再ビルドして起動 (ゼロダウンタイムではない)
dc up -d --build

# 3. DBマイグレーション (新しいマイグレーションがある場合)
dc exec api alembic upgrade head

# 4. 確認
dc ps
```

### 特定サービスだけ再ビルド

```bash
# フロントエンドのみ
dc up -d --build web

# バックエンドのみ (API + ワーカー + Beat)
dc up -d --build api worker beat
dc exec api alembic upgrade head
```

---

## 3. サービスの再起動

```bash
# 特定サービスのみ
dc restart api
dc restart worker

# 全サービス
dc restart

# コンテナを完全に再作成 (設定変更時)
dc up -d --force-recreate api
```

---

## 4. データベース操作

### マイグレーション

```bash
# 現在のリビジョン確認
dc exec api alembic current

# マイグレーション履歴
dc exec api alembic history

# 最新まで適用
dc exec api alembic upgrade head

# 1つ戻す
dc exec api alembic downgrade -1
```

### SQLの直接実行

```bash
# psql に接続
docker exec -it salon_gbp_db psql -U salon_gbp -d salon_gbp

# ワンライナーで実行
docker exec salon_gbp_db psql -U salon_gbp -d salon_gbp -c "SELECT count(*) FROM app_users;"
```

### バックアップ

```bash
# バックアップ作成
docker exec salon_gbp_db pg_dump -U salon_gbp salon_gbp | gzip > /opt/salon-gbp/backup_$(date +%Y%m%d_%H%M%S).sql.gz

# バックアップ一覧
ls -lh /opt/salon-gbp/backup_*.sql.gz
```

### リストア

```bash
# 1. アプリケーションサービスを停止 (DB接続を切断)
dc stop api worker beat web

# 2. 既存DBを削除して再作成
docker exec -i salon_gbp_db psql -U salon_gbp -d postgres -c "DROP DATABASE IF EXISTS salon_gbp;"
docker exec -i salon_gbp_db psql -U salon_gbp -d postgres -c "CREATE DATABASE salon_gbp;"

# 3. リストア
gunzip -c backup_YYYYMMDD_HHMMSS.sql.gz | docker exec -i salon_gbp_db psql -U salon_gbp salon_gbp

# 4. サービスを再起動
dc start api worker beat web
```

---

## 5. 初期データセットアップ

初回デプロイ後、またはDB再作成後に必要な手順。

### 5.1. super_admin ユーザーの作成

Supabase Dashboard でユーザーを作成後、`app_users` テーブルに登録:

```sql
-- Supabase Auth で作成したユーザーの UUID を使用
INSERT INTO app_users (supabase_user_id, display_name, role)
VALUES ('<supabase-user-uuid>', '管理者名', 'super_admin');
```

### 5.2. サロンの作成

super_admin でログインし、UI の `/admin/salons` からサロンを作成。

### 5.3. ユーザーの招待

`/admin/users/invite` から招待。`role` と `salon_ids` を指定。

### 5.4. GBP 連携

サロン管理者としてログインし、`/settings/gbp` の Connect ボタンで OAuth フローを実行。

---

## 6. ロールバック

```bash
cd /opt/salon-gbp

# コミット履歴を確認
git log --oneline -10

# 特定のコミットに戻す
git checkout <commit-hash>

# 再ビルド
dc up -d --build

# マイグレーションのダウングレード (必要な場合)
dc exec api alembic downgrade -1

# 確認
dc ps
```

---

## 7. トラブルシューティング

### 502 Bad Gateway

```bash
# 1. コンテナが起動しているか
dc ps

# 2. web → api の通信確認
docker exec salon_gbp_web wget -qO- http://api:8000/api/health

# 3. NPM → web の通信確認
docker exec gateway-app-1 wget -qO- http://salon_gbp_web:8000/healthz

# 4. ネットワーク確認
docker network inspect app-network --format '{{range .Containers}}{{.Name}} {{end}}'
```

### コンテナが再起動を繰り返す

```bash
# ログで原因を確認
dc logs --tail 50 api

# よくある原因:
# - .env の DATABASE_URL と POSTGRES_PASSWORD が不一致
# - TOKEN_ENC_KEY_B64 や OAUTH_STATE_SECRET が未設定
# - PostgreSQL がまだ起動完了していない
```

### web コンテナが unhealthy

Alpine Linux では `localhost` が IPv6 に解決されるため、ヘルスチェックが失敗する。
`docker-compose.prod.yml` のヘルスチェックが `http://127.0.0.1:8000/healthz` を使っていることを確認。

### Celery タスクが実行されない

```bash
# ワーカーが動いているか確認
dc logs --tail 50 worker

# Beat スケジューラが動いているか確認
dc logs --tail 50 beat

# Celery のタスクキューを確認
docker exec salon_gbp_worker celery -A app.worker.celery_app.celery_app inspect active

# Redis 接続の確認
docker exec salon_gbp_redis redis-cli ping
```

### ディスク容量不足

```bash
# Docker のディスク使用量
docker system df

# 未使用イメージの削除
docker image prune -a --filter "until=168h"

# 古いバックアップの削除
ls -lh /opt/salon-gbp/backup_*.sql.gz
```

### メディアファイルの確認

```bash
# メディアボリュームの内容確認
docker exec salon_gbp_api ls -la /data/media/

# メディアの公開URL確認
curl -I https://salon-gbp.ai-beauty.tokyo/media/<filename>
```

---

## 8. 定期メンテナンス

### 推奨作業

| 頻度 | 作業 | コマンド |
|------|------|---------|
| 毎日 | DBバックアップ | `docker exec salon_gbp_db pg_dump -U salon_gbp salon_gbp \| gzip > backup_$(date +%Y%m%d).sql.gz` |
| 週次 | ログ確認 | `dc logs --since 168h api worker \| grep -i error` |
| 週次 | ディスク確認 | `df -h && docker system df` |
| 月次 | 未使用イメージ削除 | `docker image prune -a --filter "until=720h"` |
| 月次 | 古いバックアップ削除 | 30日以上前のバックアップを手動で確認・削除 |

### バックアップの自動化 (cron)

```bash
# crontab -e で以下を追加
0 3 * * * docker exec salon_gbp_db pg_dump -U salon_gbp salon_gbp | gzip > /opt/salon-gbp/backup_$(date +\%Y\%m\%d).sql.gz 2>/dev/null
0 4 * * 0 find /opt/salon-gbp/backup_*.sql.gz -mtime +30 -delete 2>/dev/null
```

---

## 9. コンテナ一覧とリソース制限

| コンテナ名 | サービス | CPU | メモリ | 役割 |
|-----------|---------|-----|--------|------|
| salon_gbp_web | web | 0.25 | 128M | nginx: SPA配信 + リバースプロキシ |
| salon_gbp_api | api | 0.5 | 512M | FastAPI (uvicorn) |
| salon_gbp_worker | worker | 0.5 | 512M | Celery ワーカー (concurrency=2) |
| salon_gbp_beat | beat | 0.25 | 256M | Celery Beat スケジューラ |
| salon_gbp_db | db | 0.5 | 512M | PostgreSQL 16 |
| salon_gbp_redis | redis | 0.25 | 192M | Redis 7 (maxmemory=128mb) |
| **合計** | | **2.25** | **2.1GB** | |

---

## 10. ジョブ・アラートの確認

- UI の `/dashboard/alerts` にタスク失敗のアラートが表示される
- `job_logs` テーブルにタスク実行履歴が記録される

```bash
# 最近のアラート確認
docker exec salon_gbp_db psql -U salon_gbp -d salon_gbp -c \
  "SELECT type, message, created_at FROM alerts ORDER BY created_at DESC LIMIT 10;"

# 最近のジョブログ確認
docker exec salon_gbp_db psql -U salon_gbp -d salon_gbp -c \
  "SELECT task_name, status, started_at, finished_at FROM job_logs ORDER BY started_at DESC LIMIT 10;"
```
