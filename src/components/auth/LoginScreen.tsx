import { useState, type FormEvent } from 'react';
import { PiggyBank } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Mode = 'signin' | 'signup';

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email.trim() || !password) {
      setError('請輸入 Email 與密碼');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('密碼至少 6 個字元');
      return;
    }

    setBusy(true);
    if (mode === 'signin') {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(translateError(error));
    } else {
      const { error, needsConfirm } = await signUp(email.trim(), password);
      if (error) {
        setError(translateError(error));
      } else if (needsConfirm) {
        setInfo('註冊成功！請到信箱收確認信，點擊連結後即可登入。');
      }
      // else: session created → onAuthStateChange will route into the app
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <PiggyBank className="h-12 w-12 text-primary" />
          <h1 className="mt-3 text-2xl font-bold tracking-tight">To Do Bank</h1>
          <p className="mt-1 text-sm text-muted-foreground">完成待辦，存進撲滿</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold">
            {mode === 'signin' ? '登入' : '註冊新帳號'}
          </h2>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Email
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            密碼
            <Input
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 個字元"
              className="h-11"
            />
          </label>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {info && <p className="text-xs text-primary">{info}</p>}

          <Button type="submit" className="mt-1 h-11" disabled={busy}>
            {busy ? '處理中…' : mode === 'signin' ? '登入' : '註冊'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
              setError(null);
              setInfo(null);
            }}
            className="text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === 'signin' ? '還沒有帳號？點此註冊' : '已有帳號？點此登入'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          登入後可在「設定」連結你的 LINE，與手機同步資料。
        </p>
      </div>
    </div>
  );
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Email 或密碼錯誤';
  if (m.includes('already registered') || m.includes('already been registered'))
    return '此 Email 已註冊，請直接登入';
  if (m.includes('password')) return '密碼不符合要求（至少 6 個字元）';
  if (m.includes('email')) return 'Email 格式不正確';
  return msg;
}
