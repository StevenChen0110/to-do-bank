// Orchestrates one JARVIS feed refresh: ingest RSS → score/summarize via LLM →
// merge back source metadata → filtered, sorted items. Shared by the Vercel
// function (api/jarvis-feed.ts) and the Vite dev middleware so local === prod.
import { fetchRawItems } from './_jarvisSources.js';
import { scoreItems, type JarvisProfileInput } from './_jarvisLLM.js';

export interface JarvisItemOut {
  id: string;
  domain: 'finance' | 'tech' | 'career' | 'project';
  topic: string;
  title: string;
  whatHappened: string;
  whyItMatters: string;
  relevance: number;
  importance: number;
  factType: 'fact' | 'interpretation' | 'opinion' | 'recommendation';
  source: string;
  url: string;
  publishedAt: string;
  action?: { label: string; suggestedDate?: string };
  status: 'new';
}

export interface FeedResult {
  fallback: boolean;
  reason?: string;
  items: JarvisItemOut[];
}

/** Stable id from a URL so status survives refreshes with the same items. */
function idFor(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i += 1) h = ((h << 5) + h + url.charCodeAt(i)) | 0;
  return `jv-${(h >>> 0).toString(36)}`;
}

const MIN_RELEVANCE = 40;

export async function buildJarvisFeed(profile: JarvisProfileInput): Promise<FeedResult> {
  if (!process.env.GEMINI_API_KEY) {
    return { fallback: true, reason: 'no-key', items: [] };
  }
  let raw;
  try {
    raw = await fetchRawItems();
  } catch (e) {
    return { fallback: true, reason: `ingest-failed: ${String(e).slice(0, 120)}`, items: [] };
  }
  if (raw.length === 0) return { fallback: true, reason: 'no-items', items: [] };

  let scored;
  try {
    scored = await scoreItems(raw, profile);
  } catch (e) {
    return { fallback: true, reason: `llm-failed: ${String(e).slice(0, 120)}`, items: [] };
  }

  const items: JarvisItemOut[] = [];
  for (const s of scored) {
    const src = raw[s.index];
    if (!src) continue;
    if (typeof s.relevance !== 'number' || s.relevance < MIN_RELEVANCE) continue;
    items.push({
      id: idFor(src.link),
      domain: s.domain,
      topic: s.topic,
      title: src.title,
      whatHappened: s.whatHappened,
      whyItMatters: s.whyItMatters,
      relevance: Math.round(s.relevance),
      importance: Math.round(s.importance ?? s.relevance),
      factType: s.factType,
      source: src.source,
      url: src.link,
      publishedAt: src.publishedAt,
      ...(s.action?.label ? { action: s.action } : {}),
      status: 'new',
    });
  }
  items.sort((a, b) => b.relevance - a.relevance);
  return { fallback: false, items: items.slice(0, 12) };
}
