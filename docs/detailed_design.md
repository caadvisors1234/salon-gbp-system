# 詳細設計（実装反映版）

このリポジトリは `docs/requirements.md` の要件に基づき、以下を実装しました（2026-02-09 時点）。

## 構成

- `backend/`: FastAPI + Celery + Alembic + SQLAlchemy
- `frontend/`: React (Vite) + Supabase Auth クライアント
- `deploy/`: Docker Compose + Nginx（`/api` プロキシ、`/media` 静的配信、`/` はフロントにプロキシ）

## 重要な設計ポイント

- マルチテナント: DB の `salon_id` による論理分離（API側で強制）
- 承認制: 取得→`pending` 下書き作成→UI で編集/承認→Celery が投稿/アップロード実行
- 複数ロケーション: `gbp_locations` で複数店舗を保存し、有効ロケーション全てに下書き作成
- 画像URL: 外部画像はダウンロードして `media_assets` と VPS ローカルに保存し、Nginx から `/media/...` で公開
- 通知: 外部通知なし。`alerts` を dashboard/一覧で運用

## DB

- Alembic 初期マイグレーション: `backend/alembic/versions/0001_init.py`
- 主要テーブル:
  - `salons`, `app_users`
  - `gbp_connections`, `gbp_locations`
  - `instagram_accounts`
  - `source_contents`, `media_assets`
  - `gbp_posts`, `gbp_media_uploads`
  - `job_logs`, `alerts`

## ジョブ

- 定期ジョブ: `backend/app/worker/celery_app.py`
- タスク実装: `backend/app/worker/tasks.py`

## API

API エンドポイント一覧は `docs/api.md` を参照。

