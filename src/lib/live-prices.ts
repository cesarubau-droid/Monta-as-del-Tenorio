/**
 * Prices shown on the static pages, built from the prices saved in the admin panel.
 * They are read when the site is built; saving prices in the panel triggers a rebuild.
 * If the database can't be reached, the prices written in src/data/offer.ts are used.
 */
import { getPricing, type Pricing } from './booking';
import { formatMoney, type Price } from '../data/offer';
import type { Lang } from '../i18n/routes';

let cache: Promise<Pricing | null> | null = null;
const pricing = () => (cache ??= getPricing().catch((err) => {
  console.warn('[prices] using the prices in offer.ts:', (err as Error).message);
  return null;
}));

const both = (en: string, es: string) => ({ en, es });

export async function livePrice(kind: 'cabin' | 'tour', slug: string, fallback: Price | null): Promise<Price | null> {
  const p = await pricing();
  if (!p || !fallback) return fallback;
  const m = (n: number, lang: Lang) => formatMoney(n, 'USD', lang);

  if (kind === 'cabin') {
    const c = p.cabins[slug];
    if (!c) return fallback;
    const lowest = Math.min(c.base, ...c.seasons.map((s) => s.base));
    const extraGuests = c.max - c.included;
    const notes: Record<Lang, string[]> = { en: [], es: [] };
    if (c.extra > 0 && extraGuests === 1) {
      notes.en.push(`${m(c.extra, 'en')} for an additional guest (up to ${c.max})`);
      notes.es.push(`${m(c.extra, 'es')} por persona adicional (hasta ${c.max})`);
    } else if (c.extra > 0 && extraGuests > 1) {
      notes.en.push(`${m(c.extra, 'en')} per additional guest (up to ${c.max})`);
      notes.es.push(`${m(c.extra, 'es')} por persona adicional (hasta ${c.max})`);
    }
    return {
      ...fallback,
      amount: lowest,
      from: fallback.from || c.seasons.length > 0,
      basis: c.included === 2 ? both('per couple', 'por pareja') : both(`up to ${c.included} guests`, `hasta ${c.included} personas`),
      notes,
    };
  }

  const t = p.tours[slug];
  if (!t) return fallback;
  const notes: Record<Lang, string[]> = { en: [], es: [] };
  if (t.child !== t.adult) {
    notes.en.push(`Children under 10: ${m(t.child, 'en')}`);
    notes.es.push(`Menores de 10 años: ${m(t.child, 'es')}`);
  }
  if (t.minimum > t.adult) {
    notes.en.push(`Solo travelers: minimum rate ${m(t.minimum, 'en')}`);
    notes.es.push(`Una sola persona: tarifa mínima de ${m(t.minimum, 'es')}`);
  }
  return { ...fallback, amount: t.adult, unit: t.child !== t.adult ? 'adult' : 'person', notes };
}
