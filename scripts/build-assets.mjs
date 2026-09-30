/**
 * Generates binary brand assets at build time (kept out of git):
 *   public/og-default.jpg      — Open Graph card 1200×630 (brand card, not a photo)
 *   public/apple-touch-icon.png — 180×180 icon from public/favicon.svg
 * Runs automatically before `astro build`.
 */
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const W = 1200, H = 630;
const ridge = (y, amp, color) => {
  let d = `M0 ${H} L0 ${y}`;
  for (let k = 1; k <= 8; k++) {
    const x = (W / 8) * k;
    const yy = y - amp * (0.5 + 0.5 * Math.sin(k * 1.7 + y));
    d += ` Q${x - W / 16} ${yy - amp * 0.4} ${x} ${yy}`;
  }
  return `<path d="${d} L${W} ${H} Z" fill="${color}"/>`;
};
const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A7266"/><stop offset="1" stop-color="#1E5E47"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#s)"/>
${ridge(470, 90, '#138A7B')}${ridge(530, 70, '#0E7466')}${ridge(590, 50, '#0B5E53')}
<text x="80" y="250" font-family="Georgia, serif" font-size="76" font-weight="700" fill="#fff">Montañas del Tenorio</text>
<text x="80" y="320" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="36" fill="#E6F4F1">Río Celeste · Tenorio Volcano · Costa Rica</text>
<text x="80" y="380" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="30" fill="#E6F4F1">Cabins &amp; tours · Cabañas y tours</text>
</svg>`;

await sharp(Buffer.from(og)).jpeg({ quality: 82 }).toFile('public/og-default.jpg');
const icon = await readFile('public/favicon.svg');
await sharp(icon, { density: 400 }).resize(180, 180).flatten({ background: '#ffffff' }).png().toFile('public/apple-touch-icon.png');
console.log('build-assets: og-default.jpg + apple-touch-icon.png');
