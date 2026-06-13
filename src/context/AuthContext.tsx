import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import liff from '@line/liff';
import { setCurrentUser } from '@/lib/storage';

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string;

interface AuthState {
  userId: string | null;
  displayName: string | null;
  ready: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthState>({
  userId: null,
  displayName: null,
  ready: false,
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    userId: null,
    displayName: null,
    ready: false,
    error: null,
  });

  useEffect(() => {
    const init = async () => {
      try {
        await liff.init({ liffId: LIFF_ID });

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return; // page will redirect
        }

        const profile = await liff.getProfile();
        setCurrentUser(profile.userId);
        setState({
          userId: profile.userId,
          displayName: profile.displayName,
          ready: true,
          error: null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'LINE 登入初始化失敗';
        setState({ userId: null, displayName: null, ready: true, error: msg });
      }
    };

    void init();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
