import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function TermsOfServicePage() {
  useEffect(() => {
    document.title = "利用規約 | サロンGBP管理";
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/favicon-32x32.png" alt="" width={24} height={24} />
            <span className="text-xl font-bold text-pink-600">Salon GBP</span>
          </Link>
        </div>

        {/* Content */}
        <div className="rounded-xl border border-stone-200 bg-white px-6 py-8 shadow-sm sm:px-10">
          <h1 className="text-xl font-bold text-stone-900">利用規約</h1>
          <p className="mt-1 text-xs text-stone-400">最終更新日: 2026年2月28日</p>

          <div className="mt-8 space-y-8">
            {/* 1. はじめに */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">1. はじめに</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                本利用規約（以下「本規約」）は、株式会社サイバーアクセル・アドバイザーズ（以下「当社」）が提供する「サロンGBP管理」サービス（以下「本サービス」）の利用条件を定めるものです。本サービスを利用するすべてのユーザーは、本規約に同意したものとみなします。
              </p>
            </section>

            {/* 2. サービスの概要 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">2. サービスの概要</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                本サービスは、美容サロン向けのGoogleビジネスプロフィール（GBP）投稿管理SaaSプラットフォームです。HotPepper BeautyおよびInstagramからコンテンツを取得し、承認ワークフローを経てGoogleビジネスプロフィールに公開する機能を提供します。
              </p>
            </section>

            {/* 3. 利用資格 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">3. 利用資格</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>本サービスは、日本国内の美容サロン事業者を対象としたクローズドSaaSです</li>
                <li>アカウントは当社が発行します（セルフ登録はできません）</li>
                <li>アカウントは発行先のサロン事業者およびその従業員のみが利用できます</li>
              </ul>
            </section>

            {/* 4. アカウントと認証 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">4. アカウントと認証</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>ユーザーは、自身のアカウント認証情報（メールアドレス、パスワード）を適切に管理する責任を負います</li>
                <li>Google OAuth連携およびInstagram/Meta OAuth連携は任意です。連携により、本サービスの各機能が利用可能になります</li>
                <li>アカウントの不正使用を発見した場合は、速やかに当社までご連絡ください</li>
              </ul>
            </section>

            {/* 5. 利用上の責任 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">5. 利用上の責任</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>ユーザーは、本サービスを通じて承認・公開するコンテンツに対して責任を負います</li>
                <li>Googleビジネスプロフィール、Instagram、HotPepper Beautyの各サービスの利用規約およびポリシーを遵守してください</li>
                <li>本サービスはコンテンツの自動取得・変換を行いますが、公開前にユーザーがコンテンツを確認・承認する仕組みを提供しています</li>
              </ul>
            </section>

            {/* 6. 知的財産権 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">6. 知的財産権</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>本サービスのソフトウェア、デザイン、ロゴ等の知的財産権は当社に帰属します</li>
                <li>HotPepper Beauty、Instagram等から取得したコンテンツの権利は、各コンテンツの権利者に帰属します</li>
                <li>ユーザーが本サービスを通じて作成・公開したコンテンツの権利はユーザーに帰属します</li>
              </ul>
            </section>

            {/* 7. 禁止事項 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">7. 禁止事項</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                ユーザーは、以下の行為を行ってはなりません。
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>本サービスへの不正アクセスまたは不正アクセスの試み</li>
                <li>本サービスの機能を悪用する行為</li>
                <li>第三者へのアカウント権限の無断付与</li>
                <li>本サービスのリバースエンジニアリング、逆コンパイル、逆アセンブル</li>
                <li>法令または公序良俗に反する行為</li>
                <li>当社または第三者の権利を侵害する行為</li>
              </ul>
            </section>

            {/* 8. 免責事項 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">8. 免責事項</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>本サービスは「現状有姿」で提供されます</li>
                <li>当社は、本サービスの継続的な提供を保証するものではありません</li>
                <li>Google、Meta、HotPepper Beauty等の外部サービスの仕様変更、障害、サービス終了に起因する本サービスへの影響について、当社は責任を負いません</li>
                <li>スクレイピングにより取得したコンテンツの正確性・完全性について、当社は保証しません</li>
              </ul>
            </section>

            {/* 9. 責任の制限 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">9. 責任の制限</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                当社は、本サービスの利用に起因する間接損害、派生損害、特別損害、逸失利益、データの喪失について、その予見可能性の有無にかかわらず、一切の責任を負いません。当社の責任は、適用法令で許容される範囲において制限されます。
              </p>
            </section>

            {/* 10. サービスの変更・終了 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">10. サービスの変更・終了</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm text-stone-700">
                <li>当社は、事前通知のうえ、本サービスの内容を変更または終了する権利を有します</li>
                <li>本規約に違反した場合、当社はユーザーのアカウントを停止または削除することがあります</li>
              </ul>
            </section>

            {/* 11. 準拠法と管轄 */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">11. 準拠法と管轄</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                本規約は日本法に準拠し、日本法に従って解釈されるものとします。本規約に関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
              </p>
            </section>

            {/* 12. お問い合わせ */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">12. お問い合わせ</h2>
              <p className="text-sm leading-relaxed text-stone-700">
                本規約に関するお問い合わせは、以下までご連絡ください。
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
          <Link to="/privacy" className="hover:text-pink-600 hover:underline">
            プライバシーポリシー
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
