import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = "プライバシーポリシー | サロンGBP管理";
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/favicon-32x32.png" alt="" width={24} height={24} />
            <span className="text-xl font-bold text-pink-600">Salon GBP Manager</span>
          </Link>
        </div>

        {/* Content */}
        <div className="rounded-xl border border-stone-200 bg-white px-6 py-8 shadow-sm sm:px-10">
          <h1 className="text-xl font-bold text-stone-900">プライバシーポリシー</h1>
          <p className="mt-1 text-xs text-stone-400">最終更新日: 2026年2月28日</p>

          <div className="mt-8 space-y-8">
            {/* 1. はじめに */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">1. はじめに</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                株式会社サイバーアクセル・アドバイザーズ（以下「当社」）が運営する「サロンGBP管理」サービス（以下「本サービス」）における個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
              </p>
            </section>

            {/* 2. 収集する情報 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">2. 収集する情報</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                本サービスでは、以下の情報を収集します。
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>アカウント情報（メールアドレス、パスワード）</li>
                <li>Google OAuthで取得する情報（Googleアカウントのメールアドレス、Googleビジネスプロフィールのアカウント情報、ロケーション情報）</li>
                <li>Instagram/Meta OAuthで取得する情報（Instagramビジネスアカウント情報、投稿データ）</li>
                <li>HotPepper Beautyから取得する情報（ブログ記事、スタイル写真、クーポン情報）</li>
                <li>アクセスログ（IPアドレス、ブラウザ情報）</li>
              </ul>
            </section>

            {/* 3. 情報の利用目的 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">3. 情報の利用目的</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                収集した情報は、以下の目的で利用します。
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>サービスの提供・運用（Googleビジネスプロフィールへの投稿の作成・管理）</li>
                <li>コンテンツの取得・変換（HotPepper Beauty / Instagramからの取り込み）</li>
                <li>ユーザー認証・認可</li>
                <li>サービスの改善・障害対応</li>
              </ul>
            </section>

            {/* 4. 情報の保存とセキュリティ */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">4. 情報の保存とセキュリティ</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                当社は、収集した情報を適切に保護するため、以下のセキュリティ対策を講じています。
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>OAuthトークンはAES-256-GCMで暗号化してデータベースに保存</li>
                <li>HTTPS/TLSによる通信暗号化</li>
                <li>サロン単位のテナント分離によるデータアクセス制御</li>
                <li>ロールベースのアクセス制御（staff, super_admin）</li>
              </ul>
            </section>

            {/* 5. 第三者への提供 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">5. 第三者への提供</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                本サービスの提供にあたり、以下の第三者とデータを共有します。
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>Google LLC（Google Business Profile APIを通じた投稿・メディアの公開）</li>
                <li>Meta Platforms, Inc.（Instagram Graph APIを通じた投稿データの取得）</li>
                <li>Supabase, Inc.（認証基盤の提供）</li>
              </ul>
              <p className="text-sm leading-relaxed text-stone-700">
                当社は、お客様の個人情報を第三者に販売することはありません。法令に基づく開示要求がある場合を除き、上記以外の第三者に個人情報を提供することはありません。
              </p>
            </section>

            {/* 6. Google APIサービスの利用に関する開示 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">6. Google APIサービスの利用に関する開示</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                本サービスはGoogle APIサービスを利用しています。
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>使用するOAuthスコープ: <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">business.manage</code>, <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">openid</code>, <code className="rounded bg-stone-100 px-1 py-0.5 text-xs">email</code></li>
                <li>アクセスするデータ: Googleビジネスプロフィールのアカウント一覧、ロケーション一覧、投稿・メディアの作成</li>
              </ul>
              <p className="text-sm leading-relaxed text-stone-700">
                本サービスにおけるGoogleユーザーデータの利用および第三者への転送は、
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-600 underline hover:text-pink-700"
                >
                  Google API Services User Data Policy
                </a>
                （Limited Use要件を含む）に準拠します。
              </p>
            </section>

            {/* 7. データの保持と削除 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">7. データの保持と削除</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>アカウントが有効な間、サービスの提供に必要なデータを保持します</li>
                <li>OAuth連携を解除した場合、対応するアクセストークンおよびリフレッシュトークンを削除します</li>
                <li>アカウント削除時には、関連するすべてのトークンおよびユーザーデータを削除します</li>
                <li>スクレイピングにより取得したコンテンツは、サービスの保持ポリシーに従い保管します</li>
              </ul>
            </section>

            {/* 8. ユーザーの権利 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">8. ユーザーの権利</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                ユーザーは以下の権利を有します。
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>個人情報の開示・訂正・削除の請求</li>
                <li>OAuth連携の解除（本サービスの設定画面、またはGoogle/Metaアカウント設定から実施可能）</li>
              </ul>
              <p className="text-sm leading-relaxed text-stone-700">
                権利の行使については、下記のお問い合わせ先までご連絡ください。
              </p>
            </section>

            {/* 9. Cookieの使用 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">9. Cookieの使用</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>認証用セッションCookie（Supabase認証基盤によるもの）</li>
                <li>サードパーティのトラッキングCookieは使用しません</li>
              </ul>
            </section>

            {/* 10. ポリシーの変更 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">10. ポリシーの変更</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                当社は、必要に応じて本プライバシーポリシーを変更することがあります。変更があった場合は、このページに掲載することでお知らせいたします。変更後も本サービスの利用を継続された場合、変更後のポリシーに同意したものとみなします。
              </p>
            </section>

            {/* 11. お問い合わせ */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">11. お問い合わせ</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                本ポリシーに関するお問い合わせは、以下までご連絡ください。
              </p>
              <div className="text-sm leading-relaxed text-stone-700">
                <p>株式会社サイバーアクセル・アドバイザーズ</p>
                <p>
                  メール:{" "}
                  <a
                    href="mailto:support@ca-advisors.co.jp"
                    className="text-pink-600 underline hover:text-pink-700"
                  >
                    support@ca-advisors.co.jp
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-stone-400">
          <Link to="/terms" className="hover:text-pink-600 hover:underline">
            利用規約
          </Link>
          <span className="mx-2">|</span>
          <Link to="/login" className="hover:text-pink-600 hover:underline">
            ログイン
          </Link>
        </div>
      </div>
    </div>
  );
}
