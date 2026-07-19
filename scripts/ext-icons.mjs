// Generate browser-extension toolbar icons → extension/. One-off:
//   node scripts/ext-icons.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SRC = join(root, 'brand', 'logo-512.png');
const dir = join(root, 'extension');
mkdirSync(dir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  await sharp(SRC)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(dir, `icon-${size}.png`));
}
console.log('✓ wrote extension/icon-{16,32,48,128}.png');
