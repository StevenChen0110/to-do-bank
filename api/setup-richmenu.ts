// One-tap rich-menu setup. Visit (once, after deploy):
//   https://to-do-bank.vercel.app/api/setup-richmenu?key=tdbk-setup
// Runs server-side using the LINE token already in Vercel env — no terminal,
// no secrets to copy. Idempotent: clears old rich menus first.

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const SETUP_KEY = 'tdbk-setup';

// Single-row 4-tab bar. Bounds match public/richmenu.png (2500×843).
const richMenu = {
  size: { width: 2500, height: 843 },
  selected: true,
  name: 'todobank-tabs',
  chatBarText: '開啟選單',
  areas: [
    { bounds: { x: 0, y: 0, width: 625, height: 843 }, action: { type: 'postback', data: 'a=bank', displayText: '撲滿' } },
    { bounds: { x: 625, y: 0, width: 625, height: 843 }, action: { type: 'postback', data: 'a=list', displayText: '待辦' } },
    { bounds: { x: 1250, y: 0, width: 625, height: 843 }, action: { type: 'postback', data: 'a=wishes', displayText: '願望' } },
    { bounds: { x: 1875, y: 0, width: 625, height: 843 }, action: { type: 'postback', data: 'a=growth', displayText: '養成' } },
  ],
};

async function lineApi(url: string, opts: RequestInit): Promise<Response> {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${opts.method ?? 'GET'} ${url} → ${res.status} ${await res.text()}`);
  return res;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.query?.key !== SETUP_KEY) {
    res.status(401).send('需要正確的 key。');
    return;
  }
  if (!CHANNEL_ACCESS_TOKEN) {
    res.status(500).send('伺服器未設定 LINE token。');
    return;
  }

  const auth = { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` };
  const host = (req.headers['x-forwarded-host'] || req.headers.host) as string;
  const imgUrl = `https://${host}/richmenu.png`;

  // ?action=clear → remove the rich menu entirely (navigation moved to buttons).
  if (req.query?.action === 'clear') {
    try {
      await lineApi('https://api.line.me/v2/bot/user/all/richmenu', { method: 'DELETE', headers: auth });
    } catch { /* no default set — fine */ }
    const list = await (await lineApi('https://api.line.me/v2/bot/richmenu/list', { headers: auth })).json() as { richmenus?: { richMenuId: string }[] };
    for (const m of list.richmenus ?? []) {
      await lineApi(`https://api.line.me/v2/bot/richmenu/${m.richMenuId}`, { method: 'DELETE', headers: auth });
    }
    res.status(200).send('✅ 已移除底部選單，改用訊息上的按鈕（手機與電腦都能用）。');
    return;
  }

  // Diagnostic: ?check=1 → report what LINE currently has, without changing it.
  if (req.query?.check) {
    const list = await (await lineApi('https://api.line.me/v2/bot/richmenu/list', { headers: auth })).json();
    let def: unknown;
    try {
      def = await (await lineApi('https://api.line.me/v2/bot/user/all/richmenu', { headers: auth })).json();
    } catch (e) {
      def = `no default (${String(e)})`;
    }
    res.status(200).json({ list, default: def, imgUrl });
    return;
  }

  try {
    // 1. Remove existing rich menus (idempotent).
    const list = await (await lineApi('https://api.line.me/v2/bot/richmenu/list', { headers: auth })).json() as { richmenus?: { richMenuId: string }[] };
    for (const m of list.richmenus ?? []) {
      await lineApi(`https://api.line.me/v2/bot/richmenu/${m.richMenuId}`, { method: 'DELETE', headers: auth });
    }

    // 2. Create the rich menu.
    const created = await (await lineApi('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(richMenu),
    })).json() as { richMenuId: string };
    const id = created.richMenuId;

    // 3. Upload the image (fetched from this deployment's public asset).
    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) throw new Error(`image fetch ${imgUrl} → ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    await lineApi(`https://api-data.line.me/v2/bot/richmenu/${id}/content`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'image/png' },
      body: buf,
    });

    // 4. Set as default for all users.
    await lineApi(`https://api.line.me/v2/bot/user/all/richmenu/${id}`, { method: 'POST', headers: auth });

    res.status(200).send('✅ 完成！回到 LINE 重開聊天室，底部就會出現「撲滿｜待辦｜願望｜養成」4 分頁。');
  } catch (e) {
    res.status(500).send('設定失敗：' + String(e));
  }
}
