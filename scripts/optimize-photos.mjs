/**
 * Prepares FINAL photos for the web.
 *
 *   1. Copy originals into /photos using the media id as file name,
 *      e.g. photos/cabin-rustic.jpg, photos/hero-forest-river.jpg
 *   2. npm run optimize-photos
 *
 * For each photo it writes, into the same public/images/<folder>/ used by the
 * provisional image:
 *   <id>.jpg        (1600px wide, fallback)
 *   <id>-800.webp   (mobile)
 *   <id>-1600.webp  (desktop)
 * cropped to the aspect ratio defined in src/data/media.ts.
 * Then update that entry: src → .jpg, optimized: true, placeholder: false, alt.
 * /photos (originals) is git-ignored; only the optimized files are committed.
 */
import { readdir, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = path.resolve('photos');
const OUT = path.resolve('public/images');

// Find the folder + ratio for each id by reading the provisional SVG location.
const registry = await readFile(path.resolve('src/data/media.ts'), 'utf8');
const ratios = { '16:9': 16 / 9, '3:2': 3 / 2, '4:3': 4 / 3 };

function lookup(id) {
  const direct = registry.match(new RegExp(`ph\\('([^']+)',\\s*'${id}',\\s*'([0-9:]+)'`));
  if (direct) return { folder: direct[1], ratio: ratios[direct[2]] };
  const gal = id.match(/^(forest|river|wildlife|guides)-\d+$/);
  if (gal) return { folder: `gallery/${gal[1]}`, ratio: ratios['4:3'] };
  return null;
}

let files = [];
try {
  files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png|webp|heic|tiff?)$/i.test(f));
} catch {
  console.error('Create a /photos folder with the originals first.');
  process.exit(1);
}

for (const f of files) {
  const id = path.parse(f).name;
  const info = lookup(id);
  if (!info) {
    console.warn(`⚠ ${f}: unknown id (must match an id in src/data/media.ts) — skipped`);
    continue;
  }
  const dir = path.join(OUT, info.folder);
  await mkdir(dir, { recursive: true });
  const input = sharp(path.join(SRC, f)).rotate();
  for (const w of [800, 1600]) {
    await input
      .clone()
      .resize({ width: w, height: Math.round(w / info.ratio), fit: 'cover', position: 'attention' })
      .webp({ quality: 78 })
      .toFile(path.join(dir, `${id}-${w}.webp`));
  }
  await input
    .clone()
    .resize({ width: 1600, height: Math.round(1600 / info.ratio), fit: 'cover', position: 'attention' })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(path.join(dir, `${id}.jpg`));
  console.log(`✔ ${id} → public/images/${info.folder}/`);
}
