import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Tells the user sync is paused rather than letting the installed app look
 * broken. Edits still work — they're mirrored locally and sync on reconnect.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && !navigator.onLine,
  );

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-1.5 bg-amber-500/15 px-3 py-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400"
    >
      <WifiOff className="h-3.5 w-3.5" />
      離線中 — 變更會存在本機，連上網後自動同步
    </div>
  );
}
