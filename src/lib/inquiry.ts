/**
 * Server-side logic for reservation and contact requests.
 *
 * Flow (MVP, per documentation):
 *   Form → this API → Google Sheets (Apps Script webhook) → WhatsApp → PayPal 30% deposit
 *
 * The storage step is isolated in `storeInquiry()` so it can later be replaced
 * by a real booking/availability system without touching the forms.
 */
import { cabins, tours } from '../data/offer';
import { whatsappUrl } from '../data/site';
import type { Lang } from '../i18n/routes';

export type InquiryType = 'reservation' | 'contact';
export type Fields = Record<string, string | string[]>;
export type Errors = Record<string, string>;

const CABIN_VALUES = [...cabins.map((c) => c.slug), 'any', 'none'];
const TOUR_VALUES = tours.map((t) => t.slug);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export interface Reservation {
  type: 'reservation';
  lang: Lang;
  name: string;
  email: string;
  phone: string;
  country: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  cabin: string;
  tours: string[];
  breakfast: boolean;
  message: string;
}
export interface Contact {
  type: 'contact';
  lang: Lang;
  name: string;
  email: string;
  message: string;
}

/** Today in Costa Rica (UTC-6), as YYYY-MM-DD. */
function todayCR(): string {
  return new Date(Date.now() - 6 * 3600_000).toISOString().slice(0, 10);
}

export function parseInquiry(raw: Fields): { data?: Reservation | Contact; errors: Errors; spam: boolean } {
  const errors: Errors = {};
  const spam = str(raw.website) !== ''; // honeypot
  const type = raw.type === 'contact' ? 'contact' : 'reservation';
  const lang: Lang = raw.lang === 'es' ? 'es' : 'en';
  const name = str(raw.name, 100);
  const email = str(raw.email, 200).toLowerCase();
  const consent = ['on', 'true', '1', 'yes'].includes(str(raw.consent));

  if (name.length < 2) errors.name = 'required';
  if (!email) errors.email = 'required';
  else if (!EMAIL_RE.test(email)) errors.email = 'email';
  if (!consent) errors.consent = 'consent';

  if (type === 'contact') {
    const message = str(raw.message, 2000);
    if (message.length < 2) errors.message = 'required';
    return { data: Object.keys(errors).length ? undefined : { type, lang, name, email, message }, errors, spam };
  }

  const phone = str(raw.phone, 40);
  const digits = phone.replace(/\D/g, '');
  if (!phone) errors.phone = 'required';
  else if (digits.length < 7 || digits.length > 15 || /[^\d\s+()\-.]/.test(phone)) errors.phone = 'phone';

  const cabin = CABIN_VALUES.includes(str(raw.cabin)) ? str(raw.cabin) : 'any';
  const checkIn = str(raw.checkIn, 10);
  const checkOut = str(raw.checkOut, 10);
  const today = todayCR();
  if (!DATE_RE.test(checkIn)) errors.checkIn = 'required';
  else if (checkIn < today) errors.checkIn = 'past';
  if (cabin !== 'none') {
    if (!DATE_RE.test(checkOut)) errors.checkOut = 'required';
    else if (!errors.checkIn && checkOut <= checkIn) errors.checkOut = 'dates';
  }

  const adults = Math.min(Math.max(parseInt(str(raw.adults, 3), 10) || 0, 0), 30);
  const children = Math.min(Math.max(parseInt(str(raw.children, 3), 10) || 0, 0), 30);
  if (adults < 1) errors.adults = 'guests';

  const tourList = (Array.isArray(raw.tours) ? raw.tours : raw.tours ? [raw.tours] : [])
    .map((x) => str(x, 30))
    .filter((x) => TOUR_VALUES.includes(x));

  const data: Reservation = {
    type,
    lang,
    name,
    email,
    phone,
    country: str(raw.country, 60),
    checkIn,
    checkOut: cabin === 'none' ? '' : checkOut,
    adults,
    children,
    cabin,
    tours: [...new Set(tourList)],
    breakfast: ['on', 'true', '1', 'yes'].includes(str(raw.breakfast)),
    message: str(raw.message, 2000),
  };
  return { data: Object.keys(errors).length ? undefined : data, errors, spam };
}

export function makeReference(): string {
  const d = new Date(Date.now() - 6 * 3600_000).toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MT-${d}-${rand}`;
}

/** Prevents spreadsheet formula injection (=, +, -, @ at the start of a cell). */
function cell(v: unknown): string | number | boolean {
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  const s = Array.isArray(v) ? v.join(', ') : String(v ?? '');
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export interface StoreResult { stored: boolean; reason?: string }

/** Sends the inquiry to Google Sheets through an Apps Script web app. */
export async function storeInquiry(ref: string, data: Reservation | Contact): Promise<StoreResult> {
  const endpoint = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET ?? '';
  if (!endpoint) {
    console.warn('[inquiry] GOOGLE_SHEETS_WEBHOOK_URL not configured — request not stored', ref);
    return { stored: false, reason: 'not_configured' };
  }
  const row: Record<string, unknown> = { reference: ref, createdAt: new Date().toISOString() };
  for (const [k, v] of Object.entries(data)) row[k] = cell(v);

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Apps Script: avoids CORS preflight quirks
      body: JSON.stringify({ secret, sheet: data.type === 'contact' ? 'Contacts' : 'Reservations', row }),
      redirect: 'follow',
      signal: ctrl.signal,
    });
    const body = await res.text();
    const ok = res.ok && /"ok"\s*:\s*true/.test(body);
    if (!ok) console.error('[inquiry] Sheets webhook error', res.status, body.slice(0, 200));
    return ok ? { stored: true } : { stored: false, reason: 'webhook_error' };
  } catch (err) {
    console.error('[inquiry] Sheets webhook failed', (err as Error).message);
    return { stored: false, reason: 'webhook_unreachable' };
  } finally {
    clearTimeout(timeout);
  }
}

const plural = (n: number, [one, many]: string[]) => (n === 1 ? one : many);

/** Pre-filled WhatsApp message so the conversation starts with all details. */
export function reservationWhatsapp(ref: string, r: Reservation): string | null {
  const es = r.lang === 'es';
  const cabinName =
    r.cabin === 'any' ? (es ? 'Aún no sé' : 'Not sure yet')
    : r.cabin === 'none' ? (es ? 'Sin hospedaje (solo tours)' : 'No lodging (tours only)')
    : cabins.find((c) => c.slug === r.cabin)?.name[r.lang] ?? r.cabin;
  const tourNames = r.tours.map((s) => tours.find((t) => t.slug === s)?.name[r.lang] ?? s);
  const lines = [
    es
      ? `¡Hola Montañas del Tenorio! Acabo de enviar una solicitud de reserva (ref. ${ref}).`
      : `Hi Montañas del Tenorio! I just sent a reservation request (ref. ${ref}).`,
    `• ${es ? 'Nombre' : 'Name'}: ${r.name}`,
    r.checkOut
      ? `• ${es ? 'Fechas' : 'Dates'}: ${r.checkIn} → ${r.checkOut}`
      : `• ${es ? 'Fecha' : 'Date'}: ${r.checkIn}`,
    `• ${es ? 'Personas' : 'Guests'}: ${r.adults} ${plural(r.adults, es ? ['adulto', 'adultos'] : ['adult', 'adults'])}${r.children ? `, ${r.children} ${plural(r.children, es ? ['niño', 'niños'] : ['child', 'children'])}` : ''}`,
    `• ${es ? 'Cabaña' : 'Cabin'}: ${cabinName}`,
    tourNames.length ? `• Tours: ${tourNames.join(', ')}` : '',
    r.breakfast ? `• ${es ? 'Desayuno: sí' : 'Breakfast: yes'}` : '',
    es ? '¿Me confirman la disponibilidad?' : 'Could you confirm availability?',
  ].filter(Boolean);
  return whatsappUrl(lines.join('\n'));
}

/* Best-effort rate limit per serverless instance (5 requests / 10 min / IP). */
const hits = new Map<string, number[]>();
export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

