import { useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";

function useScrollFadeIn() {
  const ref = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("lp-visible");
        }
      });
    },
    []
  );

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      ref.current
        ?.querySelectorAll(".lp-fade")
        .forEach((el) => el.classList.add("lp-visible"));
      return;
    }

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px",
    });

    ref.current
      ?.querySelectorAll(".lp-fade")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [handleIntersection]);

  return ref;
}

export default function LandingPage() {
  const containerRef = useScrollFadeIn();

  useEffect(() => {
    document.title = "Salon GBP Manager | サロン向けGBP管理システム";
  }, []);

  return (
    <>
      <style>{`
        .lp-sans { font-family: "Inter", "Noto Sans JP", sans-serif; }
        .lp-fade {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
                      transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lp-fade.lp-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .lp-fade.lp-delay-1 { transition-delay: 0.1s; }
        .lp-fade.lp-delay-2 { transition-delay: 0.2s; }
        .lp-fade.lp-delay-3 { transition-delay: 0.3s; }
        .lp-fade.lp-delay-4 { transition-delay: 0.4s; }
        @media (prefers-reduced-motion: reduce) {
          .lp-fade {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>

      <div
        ref={containerRef}
        className="lp-sans min-h-screen flex flex-col"
        style={{ backgroundColor: "#FAFAF9" }}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#FAFAF9]/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 sm:px-8">
            <div className="flex items-center gap-2.5">
              <img
                src="/favicon-32x32.png"
                alt=""
                width={22}
                height={22}
                className="shrink-0"
              />
              <span className="text-[15px] font-semibold tracking-tight text-stone-900">
                Salon GBP Manager
              </span>
            </div>
            <Link
              to="/login"
              className="rounded-lg border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 transition-colors duration-200 hover:border-stone-400 hover:text-stone-900"
            >
              ログイン
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="mx-auto max-w-4xl px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28">
            <div className="text-center">
              <p className="lp-fade mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                GBP Management for Beauty Salons
              </p>
              <h1 className="lp-fade lp-delay-1 text-[2.25rem] font-bold leading-[1.15] tracking-tight text-stone-900 sm:text-5xl md:text-[3.5rem]">
                サロンのGBP運用を、
                <br />
                <span className="text-rose-600">もっとシンプルに。</span>
              </h1>
              <p className="lp-fade lp-delay-2 mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-stone-500 sm:text-base sm:leading-relaxed">
                HotPepper BeautyやInstagramのコンテンツを自動で取り込み、
                承認ワークフローを経てGoogleビジネスプロフィールへ一括投稿。
              </p>
              <div className="lp-fade lp-delay-3 mt-9">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-rose-700"
                >
                  管理画面へログイン
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Subtle divider line */}
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="h-px bg-stone-200" />
          </div>
        </section>

        {/* Features - 3 Steps */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="lp-fade text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                How it works
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                3つのステップで完結
              </h2>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
              {/* Step 1 */}
              <div className="lp-fade lp-delay-1">
                <div className="mb-6">
                  <span className="text-[3rem] font-bold leading-none text-stone-200">
                    01
                  </span>
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  コンテンツ取得
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-500">
                  HotPepper
                  Beautyのブログ・スタイル・クーポン、Instagramの投稿を自動で取り込み、GBP向けに変換します。
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  <span className="rounded border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
                    HotPepper
                  </span>
                  <span className="rounded border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
                    Instagram
                  </span>
                  <span className="rounded border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
                    自動変換
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="lp-fade lp-delay-2">
                <div className="mb-6">
                  <span className="text-[3rem] font-bold leading-none text-stone-200">
                    02
                  </span>
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  確認・承認
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-500">
                  取り込んだコンテンツをサロンスタッフが確認・編集・承認。意図しない投稿を防ぎ、品質を確保します。
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  <span className="rounded border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
                    プレビュー
                  </span>
                  <span className="rounded border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
                    編集
                  </span>
                  <span className="rounded border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
                    承認
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="lp-fade lp-delay-3">
                <div className="mb-6">
                  <span className="text-[3rem] font-bold leading-none text-stone-200">
                    03
                  </span>
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  GBP投稿・管理
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-stone-500">
                  Googleビジネスプロフィールへの投稿・メディアアップロードを一元管理。履歴やエラー通知も確認できます。
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  <span className="rounded border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
                    投稿管理
                  </span>
                  <span className="rounded border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
                    メディア
                  </span>
                  <span className="rounded border border-stone-200 px-2.5 py-0.5 text-[11px] font-medium text-stone-500">
                    ログ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Preview */}
        <section className="py-20 sm:py-28" style={{ backgroundColor: "#F5F5F4" }}>
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="lp-fade text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                Dashboard
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                直感的な管理画面
              </h2>
            </div>

            {/* Mock dashboard */}
            <div className="lp-fade lp-delay-1 mx-auto mt-14 max-w-3xl">
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                {/* Title bar */}
                <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-stone-200" />
                    <div className="h-2.5 w-2.5 rounded-full bg-stone-200" />
                    <div className="h-2.5 w-2.5 rounded-full bg-stone-200" />
                  </div>
                  <div className="mx-auto rounded bg-stone-50 px-12 py-1 text-[10px] text-stone-400">
                    salon-gbp.example.com
                  </div>
                </div>

                <div className="flex min-h-[280px] sm:min-h-[320px]">
                  {/* Sidebar */}
                  <div className="hidden w-44 shrink-0 border-r border-stone-100 p-4 sm:block">
                    <div className="mb-6 h-4 w-20 rounded bg-stone-100" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-rose-100" />
                        <div className="h-3 w-14 rounded bg-rose-100" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-stone-100" />
                        <div className="h-3 w-16 rounded bg-stone-100" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-stone-100" />
                        <div className="h-3 w-12 rounded bg-stone-100" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-stone-100" />
                        <div className="h-3 w-10 rounded bg-stone-100" />
                      </div>
                    </div>
                  </div>

                  {/* Content area */}
                  <div className="flex-1 p-5 sm:p-6">
                    <div className="mb-5 flex items-center justify-between">
                      <div className="h-4 w-24 rounded bg-stone-100" />
                      <div className="h-6 w-16 rounded bg-rose-50" />
                    </div>

                    {/* Cards row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg border border-stone-100 p-3">
                        <div className="mb-2 h-2 w-10 rounded bg-stone-100" />
                        <div className="text-lg font-bold text-stone-300">
                          24
                        </div>
                        <div className="mt-1 h-1.5 w-12 rounded bg-emerald-100" />
                      </div>
                      <div className="rounded-lg border border-stone-100 p-3">
                        <div className="mb-2 h-2 w-10 rounded bg-stone-100" />
                        <div className="text-lg font-bold text-stone-300">
                          8
                        </div>
                        <div className="mt-1 h-1.5 w-8 rounded bg-amber-100" />
                      </div>
                      <div className="rounded-lg border border-stone-100 p-3">
                        <div className="mb-2 h-2 w-10 rounded bg-stone-100" />
                        <div className="text-lg font-bold text-stone-300">
                          156
                        </div>
                        <div className="mt-1 h-1.5 w-14 rounded bg-blue-100" />
                      </div>
                    </div>

                    {/* Table rows */}
                    <div className="mt-5 space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg bg-stone-50/60 px-3 py-2"
                        >
                          <div className="h-7 w-7 shrink-0 rounded bg-stone-100" />
                          <div className="flex-1">
                            <div className="h-2.5 w-3/4 rounded bg-stone-100" />
                          </div>
                          <div
                            className={`h-5 w-12 rounded-full ${
                              i === 1
                                ? "bg-emerald-100"
                                : i === 2
                                  ? "bg-amber-100"
                                  : "bg-stone-100"
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust / Security */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="lp-fade text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                Security & Trust
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                安全性と信頼
              </h2>
            </div>

            <div className="lp-fade lp-delay-1 mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-white">
                  <svg
                    className="h-5 w-5 text-stone-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-stone-700">
                  AES-256暗号化
                </span>
                <span className="mt-1 text-[11px] leading-snug text-stone-400">
                  OAuthトークンを安全に保管
                </span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-white">
                  <svg
                    className="h-5 w-5 text-stone-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-stone-700">
                  テナント分離
                </span>
                <span className="mt-1 text-[11px] leading-snug text-stone-400">
                  サロン単位のデータ管理
                </span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-white">
                  <svg
                    className="h-5 w-5 text-stone-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-stone-700">
                  クローズドSaaS
                </span>
                <span className="mt-1 text-[11px] leading-snug text-stone-400">
                  契約サロン様限定
                </span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-white">
                  <svg
                    className="h-5 w-5 text-stone-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-stone-700">
                  ロールベース認可
                </span>
                <span className="mt-1 text-[11px] leading-snug text-stone-400">
                  権限に応じたアクセス制御
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* About / CTA */}
        <section
          className="border-t border-stone-200 py-20 sm:py-28"
          style={{ backgroundColor: "#F5F5F4" }}
        >
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="lp-fade text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                About
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                サービスについて
              </h2>
            </div>

            <div className="lp-fade lp-delay-1 mx-auto mt-10 max-w-2xl space-y-5 text-sm leading-relaxed text-stone-600 sm:text-[15px] sm:leading-relaxed">
              <p>
                <span className="font-semibold text-stone-900">
                  Salon GBP Manager
                </span>{" "}
                は、株式会社サイバーアクセル・アドバイザーズが運営する、美容サロン事業者向けのクローズドSaaSです。
                契約サロン様にのみアカウントを発行しており、一般登録は受け付けておりません。
              </p>
              <p>
                本サービスはGoogle Business Profile
                APIを使用してGBPの投稿管理を行います。
                すべてのOAuthトークンはAES-256-GCMで暗号化して保存され、サロン単位のテナント分離によりデータを安全に管理しています。
              </p>
            </div>

            <div className="lp-fade lp-delay-2 mt-12 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-stone-800"
              >
                管理画面へログイン
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto border-t border-stone-200 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2">
                <img
                  src="/favicon-32x32.png"
                  alt=""
                  width={16}
                  height={16}
                  className="shrink-0 opacity-40"
                />
                <span className="text-xs text-stone-400">
                  &copy; {new Date().getFullYear()}{" "}
                  株式会社サイバーアクセル・アドバイザーズ
                </span>
              </div>
              <div className="flex items-center gap-5 text-xs text-stone-400">
                <Link
                  to="/privacy"
                  className="transition-colors duration-200 hover:text-stone-600"
                >
                  プライバシーポリシー
                </Link>
                <Link
                  to="/terms"
                  className="transition-colors duration-200 hover:text-stone-600"
                >
                  利用規約
                </Link>
                <a
                  href="mailto:support@ca-advisors.co.jp"
                  className="transition-colors duration-200 hover:text-stone-600"
                >
                  お問い合わせ
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
