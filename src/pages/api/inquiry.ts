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

async function readFields(request: Request): Promise<Fields | null> {
  const type = request.headers.get('content-type') ?? '';
  try {
    if (type.includes('application/json')) {
      const body = await request.json();
      return body && typeof body === 'object' ? (body as Fields) : null;
    }
    if (type.includes('form')) {
      const fd = await request.formData();
      const out: Fields = {};
      for (const key of new Set(fd.keys())) {
        const all = fd.getAll(key).map(String);
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
    const ref = request.headers.get('referer');
    const target = ref ? new URL(ref) : new URL('/reserve', request.url);
    target.search = q;
    return Response.redirect(target.toString(), 303);
  };

  if (Number(request.headers.get('content-length') ?? 0) > 20_000) return json({ ok: false, error: 'too_large' }, 413);

  let ip = 'unknown';
  try { ip = clientAddress ?? request.headers.get('x-forwarded-for') ?? 'unknown'; } catch { /* dev */ }
  if (rateLimited(ip)) return isJson ? json({ ok: false, error: 'rate_limited' }, 429) : back('error=rate');

  const fields = await readFields(request);
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
