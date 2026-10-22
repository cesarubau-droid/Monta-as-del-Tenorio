/**
 * POST /api/inquiry — reservation & contact requests (Vercel serverless function).
 * Accepts JSON (fetch from the forms) or form-encoded (no-JS fallback).
 */
import type { APIRoute } from 'astro';
import { parseInquiry, makeReference, storeInquiry, reservationWhatsapp, rateLimited, type Fields } from '../../lib/inquiry';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const MAX_BODY = 20_000;

/** Parses the body; 'too_large' when it exceeds MAX_BODY (checked on the real body, not only Content-Length). */
async function readFields(request: Request): Promise<Fields | null | 'too_large'> {
  const type = request.headers.get('content-type') ?? '';
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return 'too_large';
    if (type.includes('application/json')) {
      const body = JSON.parse(text);
      return body && typeof body === 'object' && !Array.isArray(body) ? (body as Fields) : null;
    }
    if (type.includes('application/x-www-form-urlencoded')) {
      const fd = new URLSearchParams(text);
      const out: Fields = {};
      for (const key of new Set(fd.keys())) {
        const all = fd.getAll(key);
        out[key] = key === 'tours' ? all : all[0];
      }
      return out;
    }
  } catch {
    return null;
  }
  return null;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const isJson = (request.headers.get('content-type') ?? '').includes('application/json');
  const back = (q: string) => {
    // Only go back to a page of this site (the Referer header can point anywhere or be malformed).
    const fallback = new URL('/reserve/', request.url);
    let target = fallback;
    try {
      const ref = new URL(request.headers.get('referer') ?? '');
      if (ref.origin === fallback.origin) target = ref;
    } catch { /* no or invalid Referer */ }
    target.search = q;
    return Response.redirect(target.toString(), 303);
  };

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY) return json({ ok: false, error: 'too_large' }, 413);

  let ip = 'unknown';
  try { ip = clientAddress ?? request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'; } catch { /* dev */ }
  if (rateLimited(ip)) return isJson ? json({ ok: false, error: 'rate_limited' }, 429) : back('error=rate');

  const fields = await readFields(request);
  if (fields === 'too_large') return json({ ok: false, error: 'too_large' }, 413);
  if (!fields) return isJson ? json({ ok: false, error: 'bad_request' }, 400) : back('error=1');

  const { data, errors, spam } = parseInquiry(fields);
  const reference = makeReference();

  // Honeypot filled → pretend success, store nothing.
  if (spam) return isJson ? json({ ok: true, reference, stored: false, whatsappUrl: null }) : back('sent=1');
  if (!data) return isJson ? json({ ok: false, error: 'validation', fields: errors }, 422) : back('error=1');

  const result = await storeInquiry(reference, data);
  const whatsappUrl = data.type === 'reservation' ? reservationWhatsapp(reference, data) : null;

  // Not stored AND no WhatsApp hand-off → the request would be lost, so report an error.
  if (!result.stored && !whatsappUrl) {
    return isJson ? json({ ok: false, error: 'storage' }, 503) : back('error=1');
  }

  if (!isJson) return whatsappUrl ? Response.redirect(whatsappUrl, 303) : back('sent=1');
  return json({ ok: true, reference, stored: result.stored, whatsappUrl });
};

export const ALL: APIRoute = () => json({ ok: false, error: 'method_not_allowed' }, 405);
