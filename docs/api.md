# API 概要

ベースパス: `/api`

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
- `GET /alerts?status=open|acked|resolved`
- `POST /alerts/{alert_id}/ack`
- `POST /alerts/{alert_id}/resolve`

## Instagram（暫定: 手動登録）
- `GET /instagram/accounts`
- `POST /instagram/accounts`（`salon_admin`）
- `PATCH /instagram/accounts/{account_id}`（`salon_admin`）
- `DELETE /instagram/accounts/{account_id}`（`salon_admin`）

## Admin（`super_admin`）
- `GET /admin/salons`
- `POST /admin/salons`
- `GET /admin/users`
- `POST /admin/users/assign`
