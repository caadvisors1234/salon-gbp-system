import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import Button from "../components/Button";
import FormField, { inputClass } from "../components/FormField";
import Alert from "../components/Alert";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "ログイン | サロンGBP管理";
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-pink-600">Salon GBP</h1>
          <p className="mt-2 text-sm text-stone-500">サロン向けGBP管理システム</p>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">ログイン</h2>
          <p className="mt-1 text-sm text-stone-500">メールアドレスとパスワードを入力してください</p>

          <form
            className="mt-5 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setBusy(true);
              try {
                const { error: err } = await supabase.auth.signInWithPassword({ email, password });
                if (err) throw err;
                navigate("/dashboard");
              } catch (e2: any) {
                setError(e2?.message ?? String(e2));
              } finally {
                setBusy(false);
              }
            }}
          >
            <FormField label="メールアドレス">
              <input
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                placeholder="example@salon.jp"
                required
              />
            </FormField>
            <FormField label="パスワード">
              <input
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            </FormField>

            {error && <Alert variant="error" message={error} />}

            <Button variant="primary" loading={busy} type="submit" className="w-full">
              ログイン
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
