// Generate the LINE rich-menu image → brand/richmenu.png (2500×843, single-row
// 4-tab bar that mirrors the web bottom nav). One-off: `node scripts/richmenu-image.mjs`.
// The PNG is committed, so deploy/setup needs no image tooling at runtime.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'brand', 'richmenu.png');

const BRAND = '#00804F';
const DARK = '#1F2937';
const LINE = '#E5E7EB';
const W = 2500, H = 843;

// Single row, 4 tabs. Bounds match scripts/setup-richmenu.mjs exactly.
const cells = [
  { x: 0, w: 625, glyph: '$', label: '撲滿' },
  { x: 625, w: 625, glyph: '✓', label: '待辦' },
  { x: 1250, w: 625, glyph: '★', label: '願望' },
  { x: 1875, w: 625, glyph: '↻', label: '養成' },
];

const FONT = 'PingFang TC, Heiti TC, sans-serif';

const cellSvg = (c) => {
  const cx = c.x + c.w / 2;
  const circleCy = 320;
  const r = 85;
  const labelY = 560;
  return `
    <circle cx="${cx}" cy="${circleCy}" r="${r}" fill="${BRAND}"/>
    <text x="${cx}" y="${circleCy}" font-family="${FONT}" font-size="110" fill="white"
          text-anchor="middle" dominant-baseline="central">${c.glyph}</text>
    <text x="${cx}" y="${labelY}" font-family="${FONT}" font-weight="bold" font-size="86" fill="${DARK}"
          text-anchor="middle" dominant-baseline="central">${c.label}</text>`;
};

const grid = cells
  .slice(1)
  .map((c) => `<line x1="${c.x}" y1="60" x2="${c.x}" y2="${H - 60}" stroke="${LINE}" stroke-width="3"/>`)
  .join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="white"/>
  ${grid}
  ${cells.map(cellSvg).join('\n')}
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log('✓ wrote', OUT);
