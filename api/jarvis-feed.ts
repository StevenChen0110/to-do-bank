// POST /api/jarvis-feed  { profile } → { fallback, items }
// Ingests RSS, scores/summarizes with the LLM, returns filtered items.
// On any failure (no key, ingest/LLM error) returns fallback:true so the
// client keeps its local demo data instead of showing an error.
import { buildJarvisFeed } from './_jarvisFeed';
import type { JarvisProfileInput } from './_jarvisLLM';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const profile: JarvisProfileInput = body?.profile ?? {};
  try {
    const result = await buildJarvisFeed(profile);
    // Cache briefly at the edge; the feed only changes a few times a day.
    if (!result.fallback) res.setHeader('cache-control', 's-maxage=1800');
    res.status(200).json(result);
  } catch (e) {
    res.status(200).json({ fallback: true, reason: String(e).slice(0, 120), items: [] });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
