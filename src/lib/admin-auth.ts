/**
 * Admin panel access: one shared password (ADMIN_PASSWORD) and a signed,
 * HttpOnly session cookie valid for 12 hours.
 *
 * Forms in the panel only accept POSTs whose Origin is this site (with SameSite=Strict
 * cookies that blocks cross-site form submissions).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AstroGlobal } from 'astro';

const COOKIE = 'mt_admin';
const TTL = 12 * 3600;

const secret = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
const sign = (payload: string) => createHmac('sha256', `mt-admin:${secret()}`).update(payload).digest('base64url');

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const adminConfigured = () => (process.env.ADMIN_PASSWORD ?? '').length >= 8;

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  // Compare HMACs so the comparison is constant-time whatever the input length.
  return adminConfigured() && safeEqual(sign(`pw:${input}`), sign(`pw:${expected}`));
}

export function startSession(astro: AstroGlobal): void {
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  astro.cookies.set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true, secure: import.meta.env.PROD, sameSite: 'strict', path: '/', maxAge: TTL,
  });
}

export function endSession(astro: AstroGlobal): void {
  astro.cookies.delete(COOKIE, { path: '/' });
}

export function isAdmin(astro: AstroGlobal): boolean {
  if (!adminConfigured()) return false;
  const [exp, mac] = (astro.cookies.get(COOKIE)?.value ?? '').split('.');
  if (!exp || !mac || !safeEqual(mac, sign(exp))) return false;
  return Number(exp) > Date.now() / 1000;
}

/** True when a POST comes from a form on this same site. */
export function sameOrigin(astro: AstroGlobal): boolean {
  const origin = astro.request.headers.get('origin');
  return !!origin && origin === astro.url.origin;
}

/** Use at the top of every panel page: redirects to the login when there is no session. */
export function guard(astro: AstroGlobal): Response | null {
  if (!isAdmin(astro)) return astro.redirect('/admin/login/');
  if (astro.request.method === 'POST' && !sameOrigin(astro)) return new Response('Forbidden', { status: 403 });
  return null;
}

/** Asks Vercel to rebuild the site so the static pages show the new prices. */
export async function triggerRebuild(): Promise<boolean> {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) return false;
  try {
    const res = await fetch(hook, { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}
