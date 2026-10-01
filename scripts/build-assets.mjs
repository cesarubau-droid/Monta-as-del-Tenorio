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
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F3D45"/><stop offset="1" stop-color="#0A2A30"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#s)"/>
${ridge(470, 90, '#2A6B74')}${ridge(530, 70, '#1D555D')}${ridge(590, 50, '#6FD3D6')}
<text x="80" y="250" font-family="Georgia, serif" font-size="76" font-weight="400" fill="#fff">Montañas del Tenorio</text>
<text x="80" y="320" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="36" fill="#8FE3E0">Río Celeste · Tenorio Volcano · Costa Rica</text>
<text x="80" y="380" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="30" fill="#E3ECEC">Cabins &amp; tours · Cabañas y tours</text>
</svg>`;

await sharp(Buffer.from(og)).jpeg({ quality: 82 }).toFile('public/og-default.jpg');
const icon = await readFile('public/favicon.svg');
await sharp(icon, { density: 400 }).resize(180, 180).flatten({ background: '#ffffff' }).png().toFile('public/apple-touch-icon.png');
console.log('build-assets: og-default.jpg + apple-touch-icon.png');
