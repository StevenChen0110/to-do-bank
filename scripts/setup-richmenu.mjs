// One-time: register the rich menu on the LINE bot and set it as default.
// Run AFTER deploying:  node scripts/setup-richmenu.mjs
// Needs LINE_CHANNEL_ACCESS_TOKEN (read from env or .env.local).
// Re-running is safe: it clears old rich menus first.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function tokenFromEnv() {
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN) return process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const envPath = join(root, '.env.local');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*LINE_CHANNEL_ACCESS_TOKEN\s*=\s*(.+)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, '').trim();
    }
  }
  return null;
}

const TOKEN = tokenFromEnv();
if (!TOKEN) {
  console.error('✗ Missing LINE_CHANNEL_ACCESS_TOKEN (env or .env.local).');
  process.exit(1);
}

const auth = { Authorization: `Bearer ${TOKEN}` };
const IMG = join(root, 'brand', 'richmenu.png');

// Single-row 4-tab bar. Areas must match scripts/richmenu-image.mjs cell bounds.
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

async function api(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${opts.method ?? 'GET'} ${url} → ${res.status} ${await res.text()}`);
  return res;
}

// 1. Remove any existing rich menus (idempotent re-runs).
const existing = await (await api('https://api.line.me/v2/bot/richmenu/list', { headers: auth })).json();
for (const m of existing.richmenus ?? []) {
  await api(`https://api.line.me/v2/bot/richmenu/${m.richMenuId}`, { method: 'DELETE', headers: auth });
  console.log('· removed old rich menu', m.richMenuId);
}

// 2. Create the rich menu.
const created = await (await api('https://api.line.me/v2/bot/richmenu', {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify(richMenu),
})).json();
const id = created.richMenuId;
console.log('· created', id);

// 3. Upload the image.
await api(`https://api-data.line.me/v2/bot/richmenu/${id}/content`, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'image/png' },
  body: readFileSync(IMG),
});
console.log('· uploaded image');

// 4. Set as the default for all users.
await api(`https://api.line.me/v2/bot/user/all/richmenu/${id}`, { method: 'POST', headers: auth });
console.log('✓ rich menu is now the default. Reopen the chat to see it.');
