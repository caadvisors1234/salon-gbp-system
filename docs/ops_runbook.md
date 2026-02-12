# 運用手順（Runbook）

## 起動

```bash
docker compose -f deploy/docker-compose.yml up --build
```

## DBマイグレーション

```bash
docker compose -f deploy/docker-compose.yml exec api alembic upgrade head
```

## 初期データ

1. `super_admin` 用の `app_users` を作成（現状は Admin API を使わないため、DB へ直接 INSERT するか、既存の super_admin でログインして `/admin/users` から割当）
2. `/admin/salons` でサロン作成
3. `/admin/users/invite` でユーザー招待（`role` と `salon_ids` を指定）
4. 既存ユーザーの所属変更は `/admin/users/{user_id}/salons`（UI: ユーザー管理画面の「所属サロン更新」）

## GBP 連携

サロン管理者としてログインし、`/settings/gbp` の Connect ボタンで OAuth フローを実行。

## ジョブの確認

- `alerts`（dashboard/alerts）に失敗が上がる
- `job_logs` はDBで確認（将来UI化）
