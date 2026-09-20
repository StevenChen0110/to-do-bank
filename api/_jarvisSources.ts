// RSS ingestion for JARVIS — investment-weighted, plus tech. No API keys:
// public RSS/Atom feeds only. We keep title + snippet + link (never full text)
// and hand them to the LLM for relevance scoring + summarization.

export interface RawItem {
  title: string;
  link: string;
  source: string;
  /** ISO timestamp (best-effort; falls back to now). */
  publishedAt: string;
  snippet: string;
  /** Coarse hint so the model has a prior. */
  domainHint: 'finance' | 'tech';
}

interface Feed {
  name: string;
  url: string;
  domainHint: 'finance' | 'tech';
}

// Reliable, public feeds. Finance first (this is the priority use-case).
export const FEEDS: Feed[] = [
  { name: 'MarketWatch', url: 'http://feeds.marketwatch.com/marketwatch/topstories/', domainHint: 'finance' },
  { name: 'MarketWatch Markets', url: 'http://feeds.marketwatch.com/marketwatch/marketpulse/', domainHint: 'finance' },
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex', domainHint: 'finance' },
  { name: 'CNBC Finance', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', domainHint: 'finance' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', domainHint: 'tech' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', domainHint: 'tech' },
];

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

function safeCodePoint(n: number): string {
  try {
    return Number.isFinite(n) ? String.fromCodePoint(n) : '';
  } catch {
    return '';
  }
}

function pick(block: string, res: RegExp[]): string {
  for (const re of res) {
    const m = block.match(re);
    if (m?.[1]) return m[1];
  }
  return '';
}

function parseFeed(xml: string, feed: Feed): RawItem[] {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/(item|entry)>/gi) ?? [];
  const items: RawItem[] = [];
  for (const block of blocks.slice(0, 12)) {
    const title = decodeEntities(pick(block, [/<title[^>]*>([\s\S]*?)<\/title>/i]));
    const link =
      pick(block, [/<link[^>]*>([\s\S]*?)<\/link>/i]).trim() ||
      pick(block, [/<link[^>]+href=["']([^"']+)["']/i]);
    const date = pick(block, [
      /<pubDate>([\s\S]*?)<\/pubDate>/i,
      /<updated>([\s\S]*?)<\/updated>/i,
      /<published>([\s\S]*?)<\/published>/i,
      /<dc:date>([\s\S]*?)<\/dc:date>/i,
    ]);
    const snippet = decodeEntities(
      pick(block, [
        /<description>([\s\S]*?)<\/description>/i,
        /<summary[^>]*>([\s\S]*?)<\/summary>/i,
        /<content[^>]*>([\s\S]*?)<\/content>/i,
      ]),
    ).slice(0, 400);
    if (!title || !link) continue;
    const parsed = date ? new Date(date) : null;
    items.push({
      title,
      link: link.trim(),
      source: feed.name,
      publishedAt:
        parsed && !Number.isNaN(parsed.getTime())
          ? parsed.toISOString()
          : new Date().toISOString(),
      snippet,
      domainHint: feed.domainHint,
    });
  }
  return items;
}

/** Fetch all feeds in parallel, tolerate individual failures. */
export async function fetchRawItems(): Promise<RawItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(feed.url, {
          headers: { 'user-agent': 'Mozilla/5.0 (compatible; ToDoBankJarvis/1.0)' },
          signal: controller.signal,
        });
        const xml = await res.text();
        return parseFeed(xml, feed);
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  const all: RawItem[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const item of r.value) {
      const key = item.link || item.title;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(item);
    }
  }
  // Newest first, cap the batch we send to the model.
  all.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return all.slice(0, 24);
}
