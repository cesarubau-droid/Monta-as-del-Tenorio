/**
 * GET /api/booking/ — what the cart needs to work in the browser:
 * current prices, occupied cabin nights and people already booked per tour slot.
 * Only confirmed reservations and manual blocks are exposed (no customer data).
 */
import type { APIRoute } from 'astro';
import { cabins, tours } from '../../data/offer';
import { getPricing, cabinBusy, tourBooked, todayCR } from '../../lib/booking';
import { hasDatabase } from '../../lib/db';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const pricing = await getPricing();
    const live = hasDatabase();
    const today = todayCR();
    const body = {
      ok: true,
      live, // false = no database yet: prices are the defaults and nothing is blocked
      today,
      currency: pricing.currency,
      cabins: Object.fromEntries(await Promise.all(cabins.map(async (c) => [c.slug, {
        ...pricing.cabins[c.slug],
        busy: live ? await cabinBusy(c.slug, today) : [],
      }]))),
      tours: Object.fromEntries(await Promise.all(tours.map(async (t) => [t.slug, {
        ...pricing.tours[t.slug],
        booked: live ? await tourBooked(t.slug, today) : {},
      }]))),
    };
    return new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[booking] failed', (err as Error).message);
    return new Response(JSON.stringify({ ok: false }), { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
  }
};
