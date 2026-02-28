import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  useEffect(() => {
    document.title = "Salon GBP Manager | サロン向けGBP管理システム";
  }, []);

  return (
    <>
      <style>{`
        @keyframes lp-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(12px, -8px) scale(1.02); }
          66% { transform: translate(-8px, 6px) scale(0.98); }
        }
        @keyframes lp-float-reverse {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-10px, 6px) scale(0.97); }
          66% { transform: translate(8px, -10px) scale(1.03); }
        }
        .lp-stagger { opacity: 0; animation: lp-fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .lp-d1 { animation-delay: 0.1s; }
        .lp-d2 { animation-delay: 0.25s; }
        .lp-d3 { animation-delay: 0.4s; }
        .lp-d4 { animation-delay: 0.55s; }
        .lp-d5 { animation-delay: 0.65s; }
        .lp-d6 { animation-delay: 0.75s; }
        .lp-d7 { animation-delay: 0.85s; }
        .lp-orb { animation: lp-float 20s ease-in-out infinite; }
        .lp-orb-r { animation: lp-float-reverse 24s ease-in-out infinite; }
        .lp-serif { font-family: "Cormorant Garamond", "Georgia", serif; }
        .lp-card {
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
        }
        .lp-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px -8px rgba(236, 72, 153, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05);
        }
        .lp-trust-icon {
          transition: transform 0.3s ease, background-color 0.3s ease;
        }
        .lp-trust-item:hover .lp-trust-icon {
          transform: scale(1.1);
          background-color: #fce7f3;
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-stagger { animation: none; opacity: 1; }
          .lp-orb, .lp-orb-r { animation: none; }
          .lp-card { transition: none; }
        }
      `}</style>

      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #faf5f0 0%, #fdf2f8 40%, #f5f0ff 100%)" }}>

        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-stone-200/60 bg-white/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2.5">
              <img src="/favicon-32x32.png" alt="" width={24} height={24} className="shrink-0" />
              <span className="lp-serif text-xl font-bold tracking-wide text-pink-600">
                Salon GBP Manager
              </span>
            </div>
            <Link
              to="/login"
              className="rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-stone-800 hover:shadow-md active:scale-[0.98]"
            >
              ログイン
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Decorative orbs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="lp-orb absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full opacity-40"
              style={{ background: "radial-gradient(circle, #fce7f3 0%, transparent 70%)" }} />
            <div className="lp-orb-r absolute -right-24 top-20 h-[360px] w-[360px] rounded-full opacity-30"
              style={{ background: "radial-gradient(circle, #ede9fe 0%, transparent 70%)" }} />
            <div className="lp-orb absolute left-1/3 -bottom-40 h-[300px] w-[300px] rounded-full opacity-30"
              style={{ background: "radial-gradient(circle, #fef3c7 0%, transparent 70%)" }} />
          </div>

          <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
            <div className="text-center">
              <p className="lp-stagger lp-d1 mb-4 inline-block rounded-full border border-pink-200 bg-pink-50/80 px-4 py-1.5 text-xs font-semibold tracking-wider text-pink-700">
                BEAUTY SALON GBP MANAGEMENT
              </p>
              <h1 className="lp-stagger lp-d2 lp-serif text-4xl font-bold leading-tight text-stone-900 sm:text-5xl md:text-6xl">
                サロン向け<br className="sm:hidden" />
                <span className="text-pink-600">GBP管理</span>システム
              </h1>
              <p className="lp-stagger lp-d3 mx-auto mt-6 max-w-xl text-base leading-relaxed text-stone-500 sm:text-lg">
                HotPepper BeautyやInstagramのコンテンツを取り込み、
                承認ワークフローを経てGoogleビジネスプロフィールへ。
                サロンのGBP運用を、もっとシンプルに。
              </p>
              <div className="lp-stagger lp-d4 mt-8">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-pink-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-600/20 transition-all hover:bg-pink-700 hover:shadow-xl hover:shadow-pink-600/25 active:scale-[0.98]"
                >
                  管理画面へログイン
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features - Numbered Steps */}
        <section className="relative py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="lp-stagger lp-d3 text-center">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-pink-600">How it works</h2>
              <p className="mt-2 text-2xl font-bold text-stone-900 sm:text-3xl">3つのステップで完結</p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-3 sm:gap-8">
              {/* Step 1 */}
              <div className="lp-stagger lp-d5 lp-card rounded-2xl border border-stone-200/80 bg-white/80 p-7 backdrop-blur-sm">
                <div className="mb-5 flex items-center gap-3">
                  <span className="lp-serif flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-lg font-bold text-white shadow-md shadow-pink-600/20">
                    1
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-pink-200 to-transparent" />
                </div>
                <h3 className="text-base font-bold text-stone-900">コンテンツ取得</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-stone-500">
                  HotPepper Beautyのブログ・スタイル・クーポン、Instagramの投稿を自動で取り込み、GBP向けに変換します。
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-600">HotPepper</span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-600">Instagram</span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-600">自動変換</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="lp-stagger lp-d6 lp-card rounded-2xl border border-stone-200/80 bg-white/80 p-7 backdrop-blur-sm">
                <div className="mb-5 flex items-center gap-3">
                  <span className="lp-serif flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-lg font-bold text-white shadow-md shadow-pink-600/20">
                    2
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-pink-200 to-transparent" />
                </div>
                <h3 className="text-base font-bold text-stone-900">確認・承認</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-stone-500">
                  取り込んだコンテンツをサロンスタッフが確認・編集・承認。意図しない投稿を防ぎ、品質を確保します。
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-600">プレビュー</span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-600">編集</span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-600">承認</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="lp-stagger lp-d7 lp-card rounded-2xl border border-stone-200/80 bg-white/80 p-7 backdrop-blur-sm">
                <div className="mb-5 flex items-center gap-3">
                  <span className="lp-serif flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-lg font-bold text-white shadow-md shadow-pink-600/20">
                    3
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-pink-200 to-transparent" />
                </div>
                <h3 className="text-base font-bold text-stone-900">GBP投稿・管理</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-stone-500">
                  Googleビジネスプロフィールへの投稿・メディアアップロードを一元管理。履歴やエラー通知も確認できます。
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-600">投稿管理</span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-600">メディア</span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-600">ログ</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About / Trust */}
        <section className="border-t border-stone-200/60 bg-white/60 py-16 backdrop-blur-sm sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-pink-600">About</h2>
              <p className="mt-2 text-2xl font-bold text-stone-900 sm:text-3xl">サービスについて</p>
            </div>

            <div className="mx-auto mt-10 max-w-3xl space-y-5 text-sm leading-relaxed text-stone-600 sm:text-base sm:leading-relaxed">
              <p>
                <span className="lp-serif font-semibold text-stone-900">Salon GBP Manager</span> は、株式会社サイバーアクセル・アドバイザーズが運営する、美容サロン事業者向けのクローズドSaaSです。
                契約サロン様にのみアカウントを発行しており、一般登録は受け付けておりません。
              </p>
              <p>
                本サービスはGoogle Business Profile APIを使用してGBPの投稿管理を行います。
                すべてのOAuthトークンはAES-256-GCMで暗号化して保存され、サロン単位のテナント分離によりデータを安全に管理しています。
              </p>
            </div>

            {/* Trust indicators */}
            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="lp-trust-item flex flex-col items-center gap-2 rounded-xl p-4 text-center">
                <div className="lp-trust-icon flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
                  <svg className="h-5 w-5 text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-stone-700">AES-256暗号化</span>
              </div>
              <div className="lp-trust-item flex flex-col items-center gap-2 rounded-xl p-4 text-center">
                <div className="lp-trust-icon flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
                  <svg className="h-5 w-5 text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-stone-700">テナント分離</span>
              </div>
              <div className="lp-trust-item flex flex-col items-center gap-2 rounded-xl p-4 text-center">
                <div className="lp-trust-icon flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
                  <svg className="h-5 w-5 text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-stone-700">クローズドSaaS</span>
              </div>
              <div className="lp-trust-item flex flex-col items-center gap-2 rounded-xl p-4 text-center">
                <div className="lp-trust-icon flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
                  <svg className="h-5 w-5 text-stone-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-stone-700">ロールベース認可</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto border-t border-stone-200/60 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-2">
                <img src="/favicon-32x32.png" alt="" width={18} height={18} className="shrink-0 opacity-50" />
                <span className="text-xs text-stone-400">
                  &copy; {new Date().getFullYear()} 株式会社サイバーアクセル・アドバイザーズ
                </span>
              </div>
              <div className="flex items-center gap-5 text-xs text-stone-400">
                <Link to="/privacy" className="transition-colors hover:text-pink-600">
                  プライバシーポリシー
                </Link>
                <Link to="/terms" className="transition-colors hover:text-pink-600">
                  利用規約
                </Link>
                <a
                  href="mailto:support@ca-advisors.co.jp"
                  className="transition-colors hover:text-pink-600"
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
