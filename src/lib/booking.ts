/**
 * Booking rules shared by the cart API and the admin panel:
 * prices (editable in the panel), availability and reservations.
 *
 * Availability counts only CONFIRMED reservations plus dates blocked by hand.
 * New requests do not block anything until the owners confirm them in the panel,
 * and confirming re-checks availability so the same dates can't be sold twice.
 */
import { cabins, tours } from '../data/offer';
import { db, hasDatabase, type Query } from './db';
import type { Lang } from '../i18n/routes';

export const SLOTS = ['morning', 'afternoon', 'night'] as const;
export type Slot = (typeof SLOTS)[number];

export interface Season { from: string; to: string; base: number } // `to` inclusive (last night)
export interface CabinPricing { base: number; included: number; extra: number; max: number; seasons: Season[] }
export interface TourPricing { adult: number; child: number; minimum: number; capacity: Record<Slot, number> }
export interface Pricing { currency: 'USD'; cabins: Record<string, CabinPricing>; tours: Record<string, TourPricing> }

/** Starting point until the owners save prices in the panel (taken from src/data/offer.ts). */
export const DEFAULT_PRICING: Pricing = {
  currency: 'USD',
  cabins: {
    tenorio: { base: 120, included: 5, extra: 20, max: 7, seasons: [] },
    colibri: { base: 50, included: 2, extra: 20, max: 4, seasons: [] },
    tapir: { base: 50, included: 2, extra: 20, max: 3, seasons: [] },
  },
  tours: {
    tubing: { adult: 50, child: 50, minimum: 0, capacity: { morning: 10, afternoon: 10, night: 0 } },
    chocolate: { adult: 35, child: 15, minimum: 70, capacity: { morning: 10, afternoon: 10, night: 0 } },
    'night-walk': { adult: 40, child: 40, minimum: 0, capacity: { morning: 0, afternoon: 0, night: 10 } },
  },
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isDate = (s: unknown): s is string => typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const nightsBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
/** Today in Costa Rica (UTC-6). */
export const todayCR = () => new Date(Date.now() - 6 * 3600_000).toISOString().slice(0, 10);
const money = (n: number) => Math.round(n * 100) / 100;

/* ---------- Pricing ---------- */

/** Merges saved prices over the defaults so a new cabin/tour in offer.ts always has a price. */
function normalize(saved: Partial<Pricing> | null): Pricing {
  const out: Pricing = structuredClone(DEFAULT_PRICING);
  for (const c of cabins) {
    const s = saved?.cabins?.[c.slug];
    if (s) out.cabins[c.slug] = { ...out.cabins[c.slug], ...s, seasons: Array.isArray(s.seasons) ? s.seasons : [] };
  }
  for (const t of tours) {
    const s = saved?.tours?.[t.slug];
    if (s) out.tours[t.slug] = { ...out.tours[t.slug], ...s, capacity: { ...out.tours[t.slug].capacity, ...s.capacity } };
  }
  return out;
}

export async function getPricing(q?: Query): Promise<Pricing> {
  if (!q && !hasDatabase()) return normalize(null);
  const query = q ?? (await db());
  const rows = await query<{ value: Partial<Pricing> }>(`SELECT value FROM settings WHERE key = 'pricing'`);
  return normalize(rows[0]?.value ?? null);
}

export async function savePricing(p: Pricing): Promise<void> {
  const query = await db();
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('pricing', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify(normalize(p))],
  );
}

/** Price of one night, taking the season into account. */
export function nightBase(p: CabinPricing, night: string): number {
  const season = p.seasons.find((s) => night >= s.from && night <= s.to);
  return season ? season.base : p.base;
}

export function cabinTotal(p: CabinPricing, checkIn: string, checkOut: string, guests: number): number {
  let total = 0;
  const extraGuests = Math.max(0, guests - p.included);
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) total += nightBase(p, d) + extraGuests * p.extra;
  return money(total);
}

export function tourTotal(p: TourPricing, adults: number, children: number): number {
  return money(Math.max(p.minimum, adults * p.adult + children * p.child));
}

/* ---------- Availability ---------- */

export interface Range { from: string; to: string } // `to` exclusive

/** Occupied nights of a cabin (blocks + confirmed stays) that end after `from`. */
export async function cabinBusy(cabin: string, from = todayCR(), exceptRef?: string, q?: Query): Promise<Range[]> {
  const query = q ?? (await db());
  const rows = await query<{ f: string; t: string }>(
    `SELECT start_date::text AS f, end_date::text AS t FROM cabin_blocks WHERE cabin = $1 AND end_date > $2
     UNION ALL
     SELECT rc.check_in::text, rc.check_out::text FROM reservation_cabins rc JOIN reservations r USING (ref)
      WHERE rc.cabin = $1 AND rc.check_out > $2 AND r.status = 'confirmed' AND r.ref <> $3
     ORDER BY 1`,
    [cabin, from, exceptRef ?? ''],
  );
  return rows.map((r) => ({ from: r.f, to: r.t }));
}

export const overlaps = (a: Range, b: Range) => a.from < b.to && b.from < a.to;

/** People already confirmed on a tour, per date and slot, from `from` onwards. */
export async function tourBooked(tour: string, from = todayCR(), exceptRef?: string, q?: Query): Promise<Record<string, Record<Slot, number>>> {
  const query = q ?? (await db());
  const rows = await query<{ d: string; slot: Slot; n: number }>(
    `SELECT rt.date::text AS d, rt.slot, SUM(rt.adults + rt.children)::int AS n
       FROM reservation_tours rt JOIN reservations r USING (ref)
      WHERE rt.tour = $1 AND rt.date >= $2 AND r.status = 'confirmed' AND r.ref <> $3
      GROUP BY rt.date, rt.slot`,
    [tour, from, exceptRef ?? ''],
  );
  const out: Record<string, Record<Slot, number>> = {};
  for (const r of rows) (out[r.d] ??= { morning: 0, afternoon: 0, night: 0 })[r.slot] = Number(r.n);
  return out;
}

/* ---------- Cart validation ---------- */

export interface CabinLine { cabin: string; checkIn: string; checkOut: string; guests: number }
export interface TourLine { tour: string; date: string; slot: Slot; adults: number; children: number }
export interface PricedCart { cabins: (CabinLine & { amount: number })[]; tours: (TourLine & { amount: number })[]; total: number }
export type CartError = { item: string; code: 'unknown' | 'dates' | 'guests' | 'unavailable' | 'slot' | 'full' | 'empty' };

const int = (v: unknown, min: number, max: number) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min;
};

/** Parses untrusted cart input into clean lines (anything invalid is dropped). */
export function parseCart(raw: unknown): { cabins: CabinLine[]; tours: TourLine[] } {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as { cabins?: unknown; tours?: unknown };
  const list = (v: unknown) => (Array.isArray(v) ? v.slice(0, 10) : []) as Record<string, unknown>[];
  return {
    cabins: list(obj.cabins).map((c) => ({
      cabin: String(c?.cabin ?? ''), checkIn: String(c?.checkIn ?? ''), checkOut: String(c?.checkOut ?? ''), guests: int(c?.guests, 1, 30),
    })),
    tours: list(obj.tours).map((t) => ({
      tour: String(t?.tour ?? ''), date: String(t?.date ?? ''), slot: String(t?.slot ?? '') as Slot,
      adults: int(t?.adults, 0, 50), children: int(t?.children, 0, 50),
    })),
  };
}

/**
 * Prices every line with the current prices and checks availability.
 * The same function runs for the customer's request and when the owners confirm it.
 */
export async function checkCart(
  cart: { cabins: CabinLine[]; tours: TourLine[] },
  opts: { exceptRef?: string; today?: string } = {},
): Promise<{ priced?: PricedCart; errors: CartError[] }> {
  // Without a database (before Neon is set up) the cart still works with the default
  // prices and no availability check; the owners confirm everything by WhatsApp.
  const query = hasDatabase() ? await db() : null;
  const pricing = query ? await getPricing(query) : normalize(null);
  const today = opts.today ?? todayCR();
  const errors: CartError[] = [];
  const priced: PricedCart = { cabins: [], tours: [], total: 0 };
  if (!cart.cabins.length && !cart.tours.length) return { errors: [{ item: 'cart', code: 'empty' }] };

  for (const [i, c] of cart.cabins.entries()) {
    const id = `cabin-${i}`;
    const p = pricing.cabins[c.cabin];
    if (!p) { errors.push({ item: id, code: 'unknown' }); continue; }
    const nights = isDate(c.checkIn) && isDate(c.checkOut) ? nightsBetween(c.checkIn, c.checkOut) : 0;
    if (nights < 1 || nights > 60 || c.checkIn < today) { errors.push({ item: id, code: 'dates' }); continue; }
    if (c.guests < 1 || c.guests > p.max) { errors.push({ item: id, code: 'guests' }); continue; }
    const busy = query ? await cabinBusy(c.cabin, today, opts.exceptRef, query) : [];
    const stay = { from: c.checkIn, to: c.checkOut };
    // Also reject two stays in the same cabin inside this cart.
    const sameCart = priced.cabins.filter((x) => x.cabin === c.cabin).map((x) => ({ from: x.checkIn, to: x.checkOut }));
    if ([...busy, ...sameCart].some((b) => overlaps(stay, b))) { errors.push({ item: id, code: 'unavailable' }); continue; }
    priced.cabins.push({ ...c, amount: cabinTotal(p, c.checkIn, c.checkOut, c.guests) });
  }

  const booked: Record<string, Awaited<ReturnType<typeof tourBooked>>> = {};
  for (const [i, t] of cart.tours.entries()) {
    const id = `tour-${i}`;
    const p = pricing.tours[t.tour];
    if (!p) { errors.push({ item: id, code: 'unknown' }); continue; }
    if (!isDate(t.date) || t.date < today) { errors.push({ item: id, code: 'dates' }); continue; }
    if (!SLOTS.includes(t.slot) || !p.capacity[t.slot]) { errors.push({ item: id, code: 'slot' }); continue; }
    const people = t.adults + t.children;
    if (t.adults < 1) { errors.push({ item: id, code: 'guests' }); continue; }
    booked[t.tour] ??= query ? await tourBooked(t.tour, today, opts.exceptRef, query) : {};
    const taken = (booked[t.tour][t.date]?.[t.slot] ?? 0)
      + priced.tours.filter((x) => x.tour === t.tour && x.date === t.date && x.slot === t.slot).reduce((n, x) => n + x.adults + x.children, 0);
    if (taken + people > p.capacity[t.slot]) { errors.push({ item: id, code: 'full' }); continue; }
    priced.tours.push({ ...t, amount: tourTotal(p, t.adults, t.children) });
  }

  priced.total = money([...priced.cabins, ...priced.tours].reduce((n, x) => n + x.amount, 0));
  return errors.length ? { errors } : { priced, errors };
}

/* ---------- Reservations ---------- */

export interface Customer { lang: Lang; name: string; email: string; phone: string; country: string; message: string }

export async function createReservation(ref: string, customer: Customer, priced: PricedCart): Promise<void> {
  const query = await db();
  await query(
    `INSERT INTO reservations (ref, lang, name, email, phone, country, message, total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [ref, customer.lang, customer.name, customer.email, customer.phone, customer.country, customer.message, priced.total],
  );
  for (const c of priced.cabins) {
    await query(`INSERT INTO reservation_cabins (ref, cabin, check_in, check_out, guests, amount) VALUES ($1,$2,$3,$4,$5,$6)`,
      [ref, c.cabin, c.checkIn, c.checkOut, c.guests, c.amount]);
  }
  for (const t of priced.tours) {
    await query(`INSERT INTO reservation_tours (ref, tour, date, slot, adults, children, amount) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [ref, t.tour, t.date, t.slot, t.adults, t.children, t.amount]);
  }
}

export interface ReservationRow {
  ref: string; status: string; lang: string; name: string; email: string; phone: string; country: string; message: string;
  total: number; created_at: string;
  cabins: (CabinLine & { amount: number })[]; tours: (TourLine & { amount: number })[];
}

export async function listReservations(status?: string): Promise<ReservationRow[]> {
  const query = await db();
  const rows = await query<Omit<ReservationRow, 'cabins' | 'tours'>>(
    `SELECT ref, status, lang, name, email, phone, country, message, total::float AS total, created_at::text AS created_at
       FROM reservations ${status ? 'WHERE status = $1' : ''} ORDER BY created_at DESC LIMIT 200`,
    status ? [status] : [],
  );
  if (!rows.length) return [];
  const refs = rows.map((r) => r.ref);
  const cab = await query<{ ref: string; cabin: string; check_in: string; check_out: string; guests: number; amount: number }>(
    `SELECT ref, cabin, check_in::text, check_out::text, guests, amount::float AS amount FROM reservation_cabins WHERE ref = ANY($1) ORDER BY check_in`, [refs]);
  const tou = await query<{ ref: string; tour: string; date: string; slot: Slot; adults: number; children: number; amount: number }>(
    `SELECT ref, tour, date::text, slot, adults, children, amount::float AS amount FROM reservation_tours WHERE ref = ANY($1) ORDER BY date`, [refs]);
  return rows.map((r) => ({
    ...r,
    cabins: cab.filter((c) => c.ref === r.ref).map((c) => ({ cabin: c.cabin, checkIn: c.check_in, checkOut: c.check_out, guests: c.guests, amount: c.amount })),
    tours: tou.filter((t) => t.ref === r.ref).map((t) => ({ tour: t.tour, date: t.date, slot: t.slot, adults: t.adults, children: t.children, amount: t.amount })),
  }));
}

/** Changes a reservation's status. Confirming re-checks availability (ignoring today's cut-off). */
export async function setReservationStatus(ref: string, status: 'new' | 'confirmed' | 'cancelled'): Promise<{ ok: boolean; errors?: CartError[] }> {
  const query = await db();
  if (status === 'confirmed') {
    const [r] = await listReservations().then((all) => all.filter((x) => x.ref === ref));
    if (!r) return { ok: false };
    const check = await checkCart({ cabins: r.cabins, tours: r.tours }, { exceptRef: ref, today: '1970-01-01' });
    if (check.errors.length) return { ok: false, errors: check.errors };
  }
  await query(`UPDATE reservations SET status = $1 WHERE ref = $2`, [status, ref]);
  return { ok: true };
}

export async function listBlocks(): Promise<{ id: number; cabin: string; from: string; to: string; note: string }[]> {
  const query = await db();
  return query(`SELECT id, cabin, start_date::text AS "from", end_date::text AS "to", note FROM cabin_blocks
                 WHERE end_date >= $1 ORDER BY start_date`, [todayCR()]);
}

export async function addBlock(cabin: string, from: string, to: string, note: string): Promise<void> {
  const query = await db();
  await query(`INSERT INTO cabin_blocks (cabin, start_date, end_date, note) VALUES ($1,$2,$3,$4)`, [cabin, from, to, note.slice(0, 200)]);
}

export async function deleteBlock(id: number): Promise<void> {
  const query = await db();
  await query(`DELETE FROM cabin_blocks WHERE id = $1`, [id]);
}
