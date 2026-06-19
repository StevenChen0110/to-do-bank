import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { setCurrentUser } from '@/lib/storage';

interface AuthState {
  user: User | null;
  /** Canonical storage key: linked LINE userId, else `auth:<uid>` */
  storageKey: string | null;
  /** Linked LINE userId, or null if not linked yet */
  linkedLineId: string | null;
  ready: boolean;
}

interface AuthApi extends AuthState {
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  linkLine: (code: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthApi>({
  user: null,
  storageKey: null,
  linkedLineId: null,
  ready: false,
  signUp: async () => ({ error: null, needsConfirm: false }),
  signIn: async () => ({ error: null }),
  signInWithGoogle: async () => ({ error: null }),
  signOut: async () => {},
  linkLine: async () => ({ error: null }),
});

async function resolveStorageKey(uid: string): Promise<{ key: string; lineId: string | null }> {
  const { data } = await supabase
    .from('account_links')
    .select('line_user_id')
    .eq('auth_uid', uid)
    .maybeSingle();
  if (data?.line_user_id) return { key: data.line_user_id, lineId: data.line_user_id };
  return { key: `auth:${uid}`, lineId: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    storageKey: null,
    linkedLineId: null,
    ready: false,
  });

  const applyUser = useCallback(async (user: User | null) => {
    if (!user) {
      setCurrentUser(null);
      setState({ user: null, storageKey: null, linkedLineId: null, ready: true });
      return;
    }
    const { key, lineId } = await resolveStorageKey(user.id);
    setCurrentUser(key);
    setState({ user, storageKey: key, linkedLineId: lineId, ready: true });
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => applyUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [applyUser]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message, needsConfirm: false };
    // If email confirmation is required, session is null.
    return { error: null, needsConfirm: data.session === null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { error: error ? error.message : null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const linkLine = useCallback(
    async (code: string): Promise<{ error: string | null }> => {
      if (!state.user) return { error: '尚未登入' };
      const norm = code.trim().toUpperCase();
      if (!norm) return { error: '請輸入配對碼' };

      const { data: pairing } = await supabase
        .from('pairing_codes')
        .select('line_user_id, expires_at')
        .eq('code', norm)
        .maybeSingle();

      if (!pairing) return { error: '配對碼無效' };
      if (new Date(pairing.expires_at) < new Date()) {
        return { error: '配對碼已過期，請在 LINE 重新輸入「綁定」' };
      }

      const { error } = await supabase
        .from('account_links')
        .upsert({ auth_uid: state.user.id, line_user_id: pairing.line_user_id });
      if (error) {
        // unique violation on line_user_id → already linked to another account
        return { error: '此 LINE 帳號已被其他帳號連結' };
      }

      await supabase.from('pairing_codes').delete().eq('code', norm);
      await applyUser(state.user); // re-point storage to the LINE row
      return { error: null };
    },
    [state.user, applyUser],
  );

  return (
    <AuthContext.Provider
      value={{ ...state, signUp, signIn, signInWithGoogle, signOut, linkLine }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
