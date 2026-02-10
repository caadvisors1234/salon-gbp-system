import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import PageHeader from "../components/PageHeader";
import Card from "../components/Card";
import Badge, { statusVariant } from "../components/Badge";
import Button from "../components/Button";
import FormField, { inputClass, textareaClass } from "../components/FormField";
import Alert from "../components/Alert";
import { IconSpinner } from "../components/icons";
import { formatDateTime } from "../lib/format";
import type { PostDetail } from "../types/api";

export default function PostDetailPage() {
  const { postId } = useParams();
  const { session } = useAuth();
  const token = session?.access_token;
  const [post, setPost] = useState<PostDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    document.title = "投稿詳細 | サロンGBP管理";
  }, []);

  useEffect(() => {
    if (!token || !postId) return;
    const ac = new AbortController();
    apiFetch<PostDetail>(`/posts/${postId}`, { token, signal: ac.signal })
      .then(setPost)
      .catch((e) => {
        if (e.name === "AbortError") return;
        setErr(e?.message ?? String(e));
      });
    return () => ac.abort();
  }, [token, postId]);

  if (!post) {
    return (
      <div className="flex items-center justify-center py-12">
        <IconSpinner className="h-6 w-6 text-pink-500" />
      </div>
    );
  }

  const action = async (path: string) => {
    if (!token) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const updated = await apiFetch<PostDetail>(path, { method: "POST", token });
      setPost(updated);
      setMsg("完了しました");
    } catch (e2: any) {
      setErr(e2?.message ?? String(e2));
    } finally {
      setBusy(false);
    }
  };

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
        <Badge variant={statusVariant(post.status)}>{post.status}</Badge>
        <span className="text-stone-500">種別: {post.post_type}</span>
        <span className="text-stone-400">作成: {formatDateTime(post.created_at)}</span>
        {post.posted_at && <span className="text-stone-400">投稿: {formatDateTime(post.posted_at)}</span>}
      </div>

      <Card title="投稿テキスト（最終版）">
        <textarea
          className={`${textareaClass} h-52 font-mono`}
          value={post.summary_final}
          onChange={(e) => setPost({ ...post, summary_final: e.target.value })}
        />
        <div className="mt-2 text-xs text-stone-400">最大1500文字 / 現在: {post.summary_final.length}文字</div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FormField label="CTAタイプ">
            <input
              className={inputClass}
              value={post.cta_type ?? ""}
              onChange={(e) => setPost({ ...post, cta_type: e.target.value || null })}
            />
          </FormField>
          <FormField label="CTA URL">
            <input
              className={inputClass}
              value={post.cta_url ?? ""}
              onChange={(e) => setPost({ ...post, cta_url: e.target.value || null })}
            />
          </FormField>
          <FormField label="特典利用URL（OFFERのみ）" className="sm:col-span-2">
            <input
              className={inputClass}
              value={post.offer_redeem_online_url ?? ""}
              onChange={(e) => setPost({ ...post, offer_redeem_online_url: e.target.value || null })}
            />
          </FormField>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            loading={busy}
            onClick={async () => {
              if (!token) return;
              setBusy(true);
              setErr(null);
              setMsg(null);
              try {
                const updated = await apiFetch<PostDetail>(`/posts/${post.id}`, {
                  method: "PATCH",
                  token,
                  body: JSON.stringify({
                    summary_final: post.summary_final,
                    cta_type: post.cta_type ?? null,
                    cta_url: post.cta_url ?? null,
                    offer_redeem_online_url: post.offer_redeem_online_url ?? null
                  })
                });
                setPost(updated);
                setMsg("保存しました");
              } catch (e2: any) {
                setErr(e2?.message ?? String(e2));
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

        {post.error_message && <div className="mt-4"><Alert variant="error" message={post.error_message} /></div>}
        {msg && <div className="mt-4"><Alert variant="success" message={msg} autoHide onDismiss={() => setMsg(null)} /></div>}
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
