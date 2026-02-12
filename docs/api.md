# API 概要

ベースパス: `/api`

## サロン文脈
- サロンスコープAPIは `X-Salon-Id: <salon_uuid>` ヘッダで操作対象サロンを指定（必須）

## Health
- `GET /health`

## Auth
- `GET /me`

## Salon
- `GET /salon/settings`
- `PUT /salon/settings`（`salon_admin`）

## GBP OAuth
- `GET /oauth/google/start`（`salon_admin`、Googleへリダイレクト）
- `GET /oauth/google/callback`（Googleコールバック）

## Meta OAuth（Instagram）
- `GET /oauth/meta/start?account_type=official|staff&staff_name=...`
- `GET /oauth/meta/callback`

## GBP
- `GET /gbp/connection`
- `GET /gbp/locations`
- `GET /gbp/locations/available`
- `POST /gbp/locations/select`（`salon_admin`）
- `PATCH /gbp/locations/{location_db_id}`（`salon_admin`）

## Posts（GBP localPosts）
- `GET /posts?status=...`
- `GET /posts/{post_id}`
- `PATCH /posts/{post_id}`
- `POST /posts/{post_id}/approve`
- `POST /posts/{post_id}/retry`
- `POST /posts/{post_id}/skip`

## Media Uploads（GBP Media API）
- `GET /media_uploads?status=...`
- `GET /media_uploads/{upload_id}`
- `PATCH /media_uploads/{upload_id}`
- `POST /media_uploads/{upload_id}/approve`
- `POST /media_uploads/{upload_id}/retry`
- `POST /media_uploads/{upload_id}/skip`

## Alerts
- `GET /alerts?status=open|acked`
- `POST /alerts/{alert_id}/ack`

## Instagram（暫定: 手動登録）
- `GET /instagram/accounts`
- `POST /instagram/accounts`（`salon_admin`）
- `PATCH /instagram/accounts/{account_id}`（`salon_admin`）
- `DELETE /instagram/accounts/{account_id}`（`salon_admin`）

## Admin（`super_admin`）
- `GET /admin/salons`
- `POST /admin/salons`
- `GET /admin/users`
- `POST /admin/users/invite`
- `PUT /admin/users/{user_id}/salons`

## 主要変更メモ
- `POST /gbp/locations/select` は単一選択: `{ "location": { ... } }`（解除時は `{ "location": null }`）
- `PATCH /gbp/locations/{location_db_id}` は更新後のロケーション一覧を返す（`is_active=true` 時の他行更新を反映）
- `POST /admin/users/invite` は複数所属指定に対応: `salon_ids: string[]`
- `/me` と `/admin/users` のユーザー情報は `salon_ids` を返す（`salon_id` は廃止）
