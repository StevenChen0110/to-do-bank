// GET /api/og?url=<product url> → { title, image, price, siteName }
// Server-side so it isn't blocked by browser CORS. Best-effort scrape.
import { fetchOgProduct } from './_ogCore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  const url = typeof req.query?.url === 'string' ? req.query.url : '';
  if (!/^https?:\/\/.+/i.test(url)) {
    res.status(400).json({ error: 'invalid url' });
    return;
  }
  try {
    const data = await fetchOgProduct(url);
    res.setHeader('cache-control', 's-maxage=86400, stale-while-revalidate');
    res.status(200).json(data);
  } catch {
    res.status(502).json({ error: 'fetch failed' });
  }
}
