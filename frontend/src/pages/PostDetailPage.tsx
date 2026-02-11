import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { useToast } from "../lib/toast";
import { validate, url as urlValidator, maxLength } from "../lib/validation";
import { useApiFetch } from "../hooks/useApiFetch";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Badge, { statusVariant } from "../components/Badge";
import Button from "../components/Button";
import FormField, { inputClass, selectClass, textareaClass } from "../components/FormField";
import Alert from "../components/Alert";
import { IconSpinner } from "../components/icons";
import { formatDateTime } from "../lib/format";
import { statusLabel, postTypeLabel, translateError, CTA_TYPE_OPTIONS } from "../lib/labels";
import type { PostDetail } from "../types/api";

export default function PostDetailPage() {
  const { postId } = useParams();
  const { session } = useAuth();
  const token = session?.access_token;
  const { toast } = useToast();

  const { data: fetchedPost, error: fetchErr } = useApiFetch<PostDetail>(
    postId ? (t, s) => apiFetch(`/posts/${postId}`, { token: t, signal: s }) : null,
    [postId],
  );

  const [post, setPost] = useState<PostDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = "投稿詳細 | サロンGBP管理";
  }, []);

  useEffect(() => {
    if (fetchedPost) {
      setPost(fetchedPost);
      setFieldErrors({});
    }
  }, [fetchedPost]);

  useEffect(() => {
    if (fetchErr) setErr(fetchErr);
  }, [fetchErr]);

  if (!post) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconSpinner className="h-6 w-6 text-pink-500" />
      </div>
    );
  }

  const isOffer = post.post_type === "OFFER";

  const validateFields = () => {
    const errors: Record<string, string> = {};
    const summaryErr = validate(post.summary_final, maxLength(1500));
    if (summaryErr) errors.summary = summaryErr;
    if (post.cta_url) {
      const ctaErr = validate(post.cta_url, urlValidator());
      if (ctaErr) errors.cta_url = ctaErr;
    }
    if (post.offer_redeem_online_url) {
      const offerErr = validate(post.offer_redeem_online_url, urlValidator());
      if (offerErr) errors.offer_url = offerErr;
    }
    if (isOffer) {
      if (!post.event_title) errors.event_title = "特典タイトルは必須です";
      else if (post.event_title.length > 58) errors.event_title = "特典タイトルは58文字以内で入力してください";
      if (!post.event_start_date) errors.event_start_date = "開始日は必須です";
      if (!post.event_end_date) errors.event_end_date = "終了日は必須です";
      if (post.event_start_date && post.event_end_date && post.event_start_date > post.event_end_date) {
        errors.event_end_date = "終了日は開始日以降にしてください";
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const action = async (path: string) => {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const updated = await apiFetch<PostDetail>(path, { method: "POST", token });
      setPost(updated);
      toast("success", "完了しました");
    } catch (e: unknown) {
      setErr(translateError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const updateEventField = (field: "event_title" | "event_start_date" | "event_end_date", raw: string) => {
    const value = raw || null;
    const next = { ...post, [field]: value };
    setPost(next);
    setFieldErrors((prev) => {
      const errs = { ...prev };
      if (field === "event_title") {
        if (!value) errs.event_title = "特典タイトルは必須です";
        else if (value.length > 58) errs.event_title = "特典タイトルは58文字以内で入力してください";
        else delete errs.event_title;
      } else if (field === "event_start_date") {
        if (!value) errs.event_start_date = "開始日は必須です";
        else delete errs.event_start_date;
        // YYYY-MM-DD 形式の文字列比較は日付順と一致する
        const start = value;
        const end = next.event_end_date;
        if (start && end && start > end) errs.event_end_date = "終了日は開始日以降にしてください";
        else if (end) delete errs.event_end_date;
      } else {
        if (!value) errs.event_end_date = "終了日は必須です";
        else if (next.event_start_date && value < next.event_start_date) errs.event_end_date = "終了日は開始日以降にしてください";
        else delete errs.event_end_date;
      }
      return errs;
    });
  };

  const charCount = post.summary_final.length;
  const charOverLimit = charCount > 1500;

  return (
    <div className="space-y-4">
      <PageHeader
        title="投稿詳細"
        action={
          <Link className="text-sm font-medium text-pink-600 hover:text-pink-700" to="/posts/pending">
            ← 一覧に戻る
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={statusVariant(post.status)}>{statusLabel(post.status)}</Badge>
        <span className="text-stone-500">種別: {postTypeLabel(post.post_type)}</span>
        <span className="text-stone-400">作成: {formatDateTime(post.created_at)}</span>
        {post.posted_at && <span className="text-stone-400">投稿: {formatDateTime(post.posted_at)}</span>}
      </div>

      <Card title="投稿テキスト（最終版）">
        <FormField label="本文" error={fieldErrors.summary}>
          <textarea
            className={`${textareaClass} h-52 font-mono`}
            maxLength={1500}
            value={post.summary_final}
            onChange={(e) => {
              const value = e.target.value;
              setPost({ ...post, summary_final: value });
              setFieldErrors((prev) => {
                if (!("summary" in prev)) return prev;
                const nextErrors = { ...prev };
                const summaryErr = validate(value, maxLength(1500));
                if (summaryErr) nextErrors.summary = summaryErr;
                else delete nextErrors.summary;
                return nextErrors;
              });
            }}
          />
        </FormField>
        <div className={`mt-2 text-xs ${charOverLimit ? "text-red-600 font-medium" : "text-stone-400"}`}>
          最大1500文字 / 現在: {charCount}文字
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="ボタンの種類">
            <select
              className={selectClass}
              value={post.cta_type ?? ""}
              onChange={(e) => setPost({ ...post, cta_type: e.target.value || null })}
            >
              {CTA_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="ボタンのリンク先URL" error={fieldErrors.cta_url}>
            <input
              className={inputClass}
              value={post.cta_url ?? ""}
              onChange={(e) => {
                const value = e.target.value || null;
                setPost({ ...post, cta_url: value });
                setFieldErrors((prev) => {
                  if (!("cta_url" in prev)) return prev;
                  const nextErrors = { ...prev };
                  if (!value) {
                    delete nextErrors.cta_url;
                    return nextErrors;
                  }
                  const ctaErr = validate(value, urlValidator());
                  if (ctaErr) nextErrors.cta_url = ctaErr;
                  else delete nextErrors.cta_url;
                  return nextErrors;
                });
              }}
            />
          </FormField>
          <FormField label="特典利用URL（OFFERのみ）" className="sm:col-span-2" error={fieldErrors.offer_url}>
            <input
              className={inputClass}
              value={post.offer_redeem_online_url ?? ""}
              onChange={(e) => {
                const value = e.target.value || null;
                setPost({ ...post, offer_redeem_online_url: value });
                setFieldErrors((prev) => {
                  if (!("offer_url" in prev)) return prev;
                  const nextErrors = { ...prev };
                  if (!value) {
                    delete nextErrors.offer_url;
                    return nextErrors;
                  }
                  const offerErr = validate(value, urlValidator());
                  if (offerErr) nextErrors.offer_url = offerErr;
                  else delete nextErrors.offer_url;
                  return nextErrors;
                });
              }}
            />
          </FormField>
        </div>

        {isOffer && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <FormField label="特典タイトル" error={fieldErrors.event_title}>
              <input
                className={inputClass}
                maxLength={58}
                value={post.event_title ?? ""}
                onChange={(e) => updateEventField("event_title", e.target.value)}
              />
              <div className={`mt-1 text-xs ${(post.event_title?.length ?? 0) > 58 ? "text-red-600 font-medium" : "text-stone-400"}`}>
                最大58文字 / 現在: {post.event_title?.length ?? 0}文字
              </div>
            </FormField>
            <FormField label="開始日" error={fieldErrors.event_start_date}>
              <input
                type="date"
                className={inputClass}
                value={post.event_start_date ?? ""}
                onChange={(e) => updateEventField("event_start_date", e.target.value)}
              />
            </FormField>
            <FormField label="終了日" error={fieldErrors.event_end_date}>
              <input
                type="date"
                className={inputClass}
                value={post.event_end_date ?? ""}
                onChange={(e) => updateEventField("event_end_date", e.target.value)}
              />
            </FormField>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            loading={busy}
            disabled={Object.keys(fieldErrors).length > 0}
            onClick={async () => {
              if (!validateFields()) return;
              if (!token) return;
              setBusy(true);
              setErr(null);
              try {
                const updated = await apiFetch<PostDetail>(`/posts/${post.id}`, {
                  method: "PATCH",
                  token,
                  body: JSON.stringify({
                    summary_final: post.summary_final,
                    cta_type: post.cta_type ?? null,
                    cta_url: post.cta_url ?? null,
                    offer_redeem_online_url: post.offer_redeem_online_url ?? null,
                    ...(isOffer ? {
                      event_title: post.event_title ?? null,
                      event_start_date: post.event_start_date ?? null,
                      event_end_date: post.event_end_date ?? null,
                    } : {}),
                  }),
                });
                setPost(updated);
                setFieldErrors({});
                toast("success", "保存しました");
              } catch (e: unknown) {
                setErr(translateError(e instanceof Error ? e.message : String(e)));
              } finally {
                setBusy(false);
              }
            }}
          >
            保存
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={post.status !== "pending"}
            onClick={() => action(`/posts/${post.id}/approve`)}
          >
            承認（キュー登録）
          </Button>
          <Button
            variant="secondary"
            loading={busy}
            disabled={post.status !== "failed"}
            onClick={() => action(`/posts/${post.id}/retry`)}
          >
            再試行
          </Button>
          <Button
            variant="ghost"
            loading={busy}
            disabled={post.status === "posted"}
            onClick={() => action(`/posts/${post.id}/skip`)}
          >
            スキップ
          </Button>
        </div>

        {post.error_message && <div className="mt-4"><Alert variant="error" message={translateError(post.error_message)} /></div>}
        {err && <div className="mt-4"><Alert variant="error" message={err} dismissible onDismiss={() => setErr(null)} /></div>}
      </Card>

      <details className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-stone-700 hover:bg-stone-50">
          自動生成テキスト（原文）
        </summary>
        <pre className="whitespace-pre-wrap border-t border-stone-100 px-5 py-4 text-xs text-stone-700">{post.summary_generated}</pre>
      </details>
    </div>
  );
}
