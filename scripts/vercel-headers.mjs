/**
 * Adds security headers to every response on Vercel.
 * Runs after `astro build` and patches .vercel/output/config.json
 * (the Astro Vercel adapter does not read `headers` from vercel.json).
 */
import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../.vercel/output/config.json', import.meta.url);
let config;
try {
  config = JSON.parse(await readFile(file, 'utf8'));
} catch {
  console.log('vercel-headers: no .vercel/output (not a Vercel build) — skipped');
  process.exit(0);
}
const headers = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};
config.routes.unshift({ src: '/(.*)', headers, continue: true });
await writeFile(file, JSON.stringify(config, null, '\t'));
console.log('vercel-headers: security headers added');
