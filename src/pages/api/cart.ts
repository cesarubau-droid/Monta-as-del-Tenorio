/**
 * POST /api/cart/ — sends the cart as a reservation request.
 * Re-prices and re-checks availability on the server, saves the reservation
 * (panel + Google Sheets) and returns a WhatsApp link with the full summary.
 * Online payment will replace the WhatsApp step once the payment provider is ready.
 */
import type { APIRoute } from 'astro';
import { cabins, tours, formatMoney } from '../../data/offer';
import { checkCart, createReservation, parseCart, type PricedCart } from '../../lib/booking';
import { hasDatabase } from '../../lib/db';
import { makeReference, parseCustomer, rateLimited, storeInquiry, type Fields } from '../../lib/inquiry';
import { whatsappUrl } from '../../data/site';
import { useT, fmt } from '../../i18n/ui';
import type { Lang } from '../../i18n/routes';

export const prerender = false;

const MAX_BODY = 20_000;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

const fmtDate = (iso: string, lang: Lang) =>
  new Intl.DateTimeFormat(lang === 'es' ? 'es-CR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

/** One line per item, used for WhatsApp and for the notification e-mail. */
function cartLines(p: PricedCart, lang: Lang): string[] {
  const t = useT(lang).cart;
  const m = (n: number) => formatMoney(n, 'USD', lang);
  const count = (n: number, one: string, many: string) => (n === 1 ? one : fmt(many, { n }));
  return [
    ...p.cabins.map((c) => `• ${cabins.find((x) => x.slug === c.cabin)?.name[lang]}: ${fmtDate(c.checkIn, lang)} → ${fmtDate(c.checkOut, lang)} · ${count(c.guests, t.guestsOne, t.guestsN)} · ${m(c.amount)}`),
    ...p.tours.map((x) => `• ${tours.find((y) => y.slug === x.tour)?.name[lang]}: ${fmtDate(x.date, lang)} · ${t.slots[x.slot]} · ${count(x.adults, t.adultsOne, t.adultsN)}${x.children ? `, ${count(x.children, t.childrenOne, t.childrenN)}` : ''} · ${m(x.amount)}`),
    `${t.total}: ${m(p.total)}`,
  ];
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let ip = 'unknown';
  try { ip = clientAddress ?? request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'; } catch { /* dev */ }
  if (rateLimited(`cart:${ip}`)) return json({ ok: false, error: 'rate_limited' }, 429);

  let body: { customer?: Fields; cart?: unknown };
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ ok: false, error: 'too_large' }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  const { data: customer, errors, spam } = parseCustomer((body.customer ?? {}) as Fields);
  const ref = makeReference();
  if (spam) return json({ ok: true, reference: ref, whatsappUrl: null });
  if (!customer) return json({ ok: false, error: 'validation', fields: errors }, 422);

  const check = await checkCart(parseCart(body.cart)).catch((err) => {
    console.error('[cart] check failed', (err as Error).message);
    return null;
  });
  if (!check) return json({ ok: false, error: 'storage' }, 503);
  if (!check.priced) return json({ ok: false, error: 'cart', items: check.errors }, 409);
  const priced = check.priced;

  let stored = false;
  if (hasDatabase()) {
    try { await createReservation(ref, customer, priced); stored = true; } catch (err) {
      console.error('[cart] could not save reservation', ref, (err as Error).message);
    }
  }

  // Google Sheets row + e-mail notice (same webhook as the contact form), best effort.
  const lines = cartLines(priced, customer.lang);
  const first = [...priced.cabins.map((c) => c.checkIn), ...priced.tours.map((x) => x.date)].sort()[0];
  const sheet = await storeInquiry(ref, {
    type: 'reservation', lang: customer.lang, name: customer.name, email: customer.email, phone: customer.phone,
    country: customer.country, checkIn: first, checkOut: priced.cabins.map((c) => c.checkOut).sort().at(-1) ?? '',
    adults: Math.max(0, ...priced.cabins.map((c) => c.guests), ...priced.tours.map((x) => x.adults)),
    children: Math.max(0, ...priced.tours.map((x) => x.children)),
    cabin: priced.cabins.map((c) => c.cabin).join(', ') || 'none', tours: priced.tours.map((x) => x.tour), breakfast: false,
    message: [...lines, customer.message].filter(Boolean).join('\n'),
  });
  stored ||= sheet.stored;

  const t = useT(customer.lang).cart;
  const wa = whatsappUrl([fmt(t.waIntro, { ref }), `• ${customer.name}`, ...lines, t.waOutro].join('\n'));
  if (!stored && !wa) return json({ ok: false, error: 'storage' }, 503);
  return json({ ok: true, reference: ref, stored, total: priced.total, whatsappUrl: wa });
};

export const ALL: APIRoute = () => json({ ok: false, error: 'method_not_allowed' }, 405);
