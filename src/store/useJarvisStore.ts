import { create } from 'zustand';
import type { JarvisItem, JarvisStatus } from '@/lib/jarvis/types';
import { buildMockItems } from '@/lib/jarvis/mockData';

// The JARVIS intelligence layer keeps its own store, separate from the
// To-do Bank blob. Items come from /api/jarvis-feed (real RSS + Gemini); if
// that isn't available (no key / offline) we fall back to local demo data so
// the page is never empty. Status changes are in-memory (Slice 4 persists).
interface JarvisStore {
  items: JarvisItem[];
  loading: boolean;
  /** True while showing local demo data rather than live intelligence. */
  usingMock: boolean;
  /** Whether a live fetch has been attempted this session. */
  hasFetched: boolean;
  refreshedAt: string;
  setStatus: (id: string, status: JarvisStatus) => void;
  refresh: (profile?: unknown) => Promise<void>;
}

export const useJarvisStore = create<JarvisStore>((set, get) => ({
  items: buildMockItems(),
  loading: false,
  usingMock: true,
  hasFetched: false,
  refreshedAt: new Date().toISOString(),
  setStatus: (id, status) =>
    set((s) => ({
      items: s.items.map((it) => (it.id === id ? { ...it, status } : it)),
    })),
  refresh: async (profile) => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const res = await fetch('/api/jarvis-feed', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ profile: profile ?? {} }),
      });
      const data = (await res.json()) as {
        fallback?: boolean;
        items?: JarvisItem[];
      };
      if (!data.fallback && Array.isArray(data.items) && data.items.length > 0) {
        set({
          items: data.items,
          usingMock: false,
          loading: false,
          hasFetched: true,
          refreshedAt: new Date().toISOString(),
        });
        return;
      }
      // Fallback — keep whatever we have (demo data).
      set({ loading: false, hasFetched: true, refreshedAt: new Date().toISOString() });
    } catch {
      set({ loading: false, hasFetched: true });
    }
  },
}));
