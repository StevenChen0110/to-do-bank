// Shared Open Graph / product scraper used by both the Vercel function
// (api/og.ts) and the Vite dev middleware (vite.config.ts) so "貼商品連結"
// works locally and in production. Best-effort: many sites (esp. JS-rendered
// ones) won't expose price in the initial HTML — the UI falls back to manual.

export interface OgProduct {
  title?: string;
  image?: string;
  price?: number;
  siteName?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function firstMatch(html: string, patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return undefined;
}

export async function fetchOgProduct(url: string): Promise<OgProduct> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (compatible; ToDoBankBot/1.0; +https://to-do-bank.vercel.app)',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'zh-TW,zh;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    html = (await res.text()).slice(0, 500_000);
  } finally {
    clearTimeout(timer);
  }

  const title = firstMatch(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ]);
  const image = firstMatch(html, [
    /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ]);
  const priceStr = firstMatch(html, [
    /<meta[^>]+property=["'](?:product:price:amount|og:price:amount)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i,
  ]);
  const siteName = firstMatch(html, [
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
  ]);

  const priceNum = priceStr ? Number(priceStr.replace(/[^\d.]/g, '')) : NaN;
  return {
    title,
    image,
    price: Number.isFinite(priceNum) && priceNum > 0 ? Math.round(priceNum) : undefined,
    siteName,
  };
}
