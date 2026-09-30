/**
 * Generates the PROVISIONAL illustrations used until the final photos arrive.
 * They are clearly labelled "Imagen provisional · Provisional image" and are
 * NOT photographs of Montañas del Tenorio.
 *
 *   npm run placeholders
 *
 * Output: public/images/**.svg (ids match src/data/media.ts)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('public');

// Seeded PRNG so output is stable between runs.
function rng(seed) {
  let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const palettes = {
  day: { sky: ['#CFE9E4', '#EEF6F2'], m: ['#8FC5B6', '#4FA38F', '#2D7D5F', '#1E5E47'] },
  mist: { sky: ['#DDE8E4', '#F4F7F5'], m: ['#A9C9BE', '#6FA896', '#3F8A72', '#24644E'] },
  dusk: { sky: ['#F3D3C2', '#FBEDE4'], m: ['#C79A86', '#8E7A6B', '#4E6B5A', '#2F4D3F'] },
  night: { sky: ['#0E1B2B', '#1C3346'], m: ['#23415A', '#1B3447', '#132736', '#0B1822'] },
  cacao: { sky: ['#F1E2D3', '#FAF3EC'], m: ['#C9A184', '#9C7153', '#6E4B35', '#4A3122'] },
};

function mountains(W, H, pal, r, withRiver) {
  let out = '';
  pal.m.forEach((c, i) => {
    const base = H * (0.45 + i * 0.12);
    const amp = H * (0.18 - i * 0.03);
    let d = `M0 ${H} L0 ${base}`;
    const steps = 8;
    for (let k = 1; k <= steps; k++) {
      const x = (W / steps) * k;
      const y = base - amp * (0.3 + r() * 0.9);
      const cx = x - W / steps / 2;
      d += ` Q${cx.toFixed(0)} ${(y - amp * 0.35).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)}`;
    }
    d += ` L${W} ${H} Z`;
    out += `<path d="${d}" fill="${c}"/>`;
    if (i === 2) {
      // tree line
      for (let t = 0; t < 26; t++) {
        const x = r() * W;
        const y = base + H * 0.02 + r() * H * 0.06;
        const s = H * (0.035 + r() * 0.03);
        out += `<path d="M${x.toFixed(0)} ${(y - s * 2).toFixed(0)} L${(x - s).toFixed(0)} ${y.toFixed(0)} L${(x + s).toFixed(0)} ${y.toFixed(0)} Z" fill="${pal.m[3]}" opacity=".85"/>`;
      }
    }
  });
  if (withRiver) {
    out += `<path d="M${W * 0.35} ${H} C${W * 0.45} ${H * 0.86} ${W * 0.62} ${H * 0.86} ${W * 0.58} ${H * 0.74} C${W * 0.55} ${H * 0.68} ${W * 0.7} ${H * 0.66} ${W * 0.78} ${H * 0.64} L${W * 0.84} ${H * 0.66} C${W * 0.72} ${H * 0.7} ${W * 0.68} ${H * 0.76} ${W * 0.74} ${H * 0.84} C${W * 0.78} ${H * 0.9} ${W * 0.7} ${H * 0.96} ${W * 0.66} ${H} Z" fill="#6FD3D6" opacity=".95"/>`;
  }
  return out;
}

const icons = {
  cabin: (W, H, c) => `<g transform="translate(${W * 0.2} ${H * 0.58})" fill="${c}"><path d="M0 60 L70 0 L140 60 Z"/><rect x="18" y="58" width="104" height="70"/><rect x="58" y="86" width="24" height="42" fill="#F3E3C8"/></g>`,
  tube: (W, H) => `<g transform="translate(${W * 0.62} ${H * 0.8})"><ellipse rx="46" ry="16" fill="#1E3A34"/><ellipse rx="26" ry="8" fill="#6FD3D6"/></g>`,
  bird: (W, H, c) => `<g transform="translate(${W * 0.7} ${H * 0.28})" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"><path d="M0 0 q20 -18 40 0 q20 -18 40 0"/><path d="M-90 40 q14 -12 28 0 q14 -12 28 0"/></g>`,
  frog: (W, H) => `<g transform="translate(${W * 0.7} ${H * 0.78})"><ellipse rx="40" ry="24" fill="#39B36B"/><circle cx="-22" cy="-22" r="12" fill="#39B36B"/><circle cx="22" cy="-22" r="12" fill="#39B36B"/><circle cx="-22" cy="-22" r="6" fill="#D85A30"/><circle cx="22" cy="-22" r="6" fill="#D85A30"/></g>`,
  moon: (W, H) => `<circle cx="${W * 0.8}" cy="${H * 0.2}" r="${H * 0.07}" fill="#F4F1DE"/>` + Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 97) % W}" cy="${((i * 53) % (H * 0.4)).toFixed(0)}" r="2" fill="#fff" opacity=".7"/>`).join(''),
  sun: (W, H) => `<circle cx="${W * 0.78}" cy="${H * 0.22}" r="${H * 0.08}" fill="#FFF3D6" opacity=".9"/>`,
  cacao: (W, H) => `<g transform="translate(${W * 0.66} ${H * 0.62}) rotate(-20)"><ellipse rx="44" ry="90" fill="#B8612E"/><path d="M0 -88 V88 M-22 -80 Q-30 0 -22 80 M22 -80 Q30 0 22 80" stroke="#8A4420" stroke-width="5" fill="none"/></g>`,
  person: (W, H, c) => `<g transform="translate(${W * 0.3} ${H * 0.62})" fill="${c}"><circle cy="-70" r="20"/><path d="M-26 -44 h52 l10 90 h-72 Z"/></g>`,
  lookout: (W, H, c) => `<g transform="translate(${W * 0.22} ${H * 0.5})" stroke="${c}" stroke-width="8" fill="none"><path d="M0 0 H160 M10 0 V90 M150 0 V90 M0 -30 H160 M0 -30 V0 M160 -30 V0"/></g>`,
};

function svg({ id, W, H, palette = 'day', river = false, icon, iconColor = '#1E3A34', label: showLabel = true }) {
  const r = rng(id);
  const pal = palettes[palette];
  const label = 'Imagen provisional · Provisional image';
  const fs = Math.round(H * 0.035);
  const pw = fs * 20;
  const ph = fs * 2;
  const dark = palette === 'night';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
<!-- PROVISIONAL IMAGE (${id}) — replace with final photo. See src/data/media.ts -->
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.sky[0]}"/><stop offset="1" stop-color="${pal.sky[1]}"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#s)"/>
${palette === 'night' ? icons.moon(W, H) : icons.sun(W, H)}
${mountains(W, H, pal, r, river)}
${(icon || []).map((i) => icons[i](W, H, iconColor)).join('')}
${showLabel ? `<g transform="translate(${Math.round(H * 0.04)} ${H - ph - Math.round(H * 0.04)})"><rect width="${pw}" height="${ph}" rx="${ph / 2}" fill="${dark ? '#FFFFFF' : '#000000'}" opacity=".55"/><text x="${pw / 2}" y="${ph * 0.66}" text-anchor="middle" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="${fs}" font-weight="600" fill="${dark ? '#000' : '#fff'}">${label}</text></g>` : ''}
</svg>`;
}

const S169 = [1600, 900];
const S32 = [1200, 800];
const S43 = [1200, 900];

// Hero slides carry no in-image label: the hero shows an HTML "Provisional image" note instead.
const jobs = [
  ['hero/hero-forest-river', S169, { palette: 'mist', river: true, label: false }],
  ['hero/hero-cabin-couple', S169, { palette: 'dusk', icon: ['cabin'], label: false }],
  ['hero/hero-family-tubing', S169, { palette: 'day', river: true, icon: ['tube'], label: false }],
  ['hero/hero-wildlife', S169, { palette: 'day', icon: ['bird', 'frog'], label: false }],
  ['about/founders', S43, { palette: 'dusk', icon: ['person', 'cabin'] }],
  ['about/lookout', S43, { palette: 'mist', icon: ['lookout'] }],
  ['cabins/cabin-rustic', S32, { palette: 'mist', icon: ['cabin'] }],
  ['cabins/cabin-semirustic', S32, { palette: 'day', icon: ['cabin'] }],
  ['cabins/cabin-accessible', S32, { palette: 'dusk', icon: ['cabin', 'bird'] }],
  ['tours/tour-tubing', S32, { palette: 'day', river: true, icon: ['tube'] }],
  ['tours/tour-chocolate', S32, { palette: 'cacao', icon: ['cacao'] }],
  ['tours/tour-night-walk', S32, { palette: 'night', icon: ['frog'] }],
];
const galleryPal = { forest: ['mist', 'day', 'dusk', 'mist'], river: ['day', 'mist', 'day', 'dusk'], wildlife: ['day', 'mist', 'night', 'dusk'], guides: ['day', 'dusk', 'mist', 'night'] };
const galleryIcon = { forest: [[], ['lookout'], ['cabin'], []], river: [[], ['tube'], ['tube'], []], wildlife: [['bird'], ['frog'], ['frog'], ['bird']], guides: [['person'], ['person'], ['person', 'cacao'], ['person']] };
for (const cat of Object.keys(galleryPal)) {
  for (let i = 0; i < 4; i++) {
    jobs.push([`gallery/${cat}/${cat}-${i + 1}`, S43, { palette: galleryPal[cat][i], river: cat === 'river', icon: galleryIcon[cat][i], iconColor: galleryPal[cat][i] === 'night' ? '#E8E8E8' : '#1E3A34' }]);
  }
}

for (const [rel, [W, H], opts] of jobs) {
  const file = path.join(root, 'images', `${rel}.svg`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, svg({ id: rel, W, H, ...opts }));
}
console.log(`✔ ${jobs.length} provisional images written to public/images`);
