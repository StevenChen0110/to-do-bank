// Generate PWA icons from brand/logo-512.png → public/. One-off:
//   node scripts/pwa-icons.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SRC = join(root, 'brand', 'logo-512.png');
const out = (f) => join(root, 'public', f);

// Transparent "any" icons (resize the logo as-is).
await sharp(SRC).resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(out('pwa-192x192.png'));
await sharp(SRC).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(out('pwa-512x512.png'));

// Maskable + apple-touch: the logo is already a green rounded icon, so fill the
// transparent corners with brand green for a seamless full-bleed square that the
// OS can mask / round.
async function onBrand(size, file) {
  const logo = await sharp(SRC).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: '#00804F' } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(out(file));
}
await onBrand(512, 'maskable-512x512.png');
await onBrand(180, 'apple-touch-icon.png');

console.log('✓ wrote pwa-192x192, pwa-512x512, maskable-512x512, apple-touch-icon');
