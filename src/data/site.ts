/**
 * Business configuration.
 *
 * Everything that is NOT defined in the official documentation (phone, email,
 * social URLs, prices…) comes from environment variables so it can be set in
 * Vercel without touching code. Empty values degrade gracefully: the related
 * button or link is hidden or falls back to the contact page.
 *
 * PUBLIC_* variables are inlined at build time → redeploy after changing them.
 */
const env = import.meta.env;

const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

/** Digits only, international format without "+" (e.g. 50688887777). */
const whatsappNumber = clean(env.PUBLIC_WHATSAPP_NUMBER)?.replace(/\D/g, '') || null;

export const site = {
  name: 'Montañas del Tenorio',
  shortName: 'Montañas del Tenorio',
  region: { en: 'Río Celeste · Tenorio Volcano, Costa Rica', es: 'Río Celeste · Volcán Tenorio, Costa Rica' },
  whatsappNumber,
  email: clean(env.PUBLIC_CONTACT_EMAIL),
  mapsUrl: clean(env.PUBLIC_MAPS_URL),
  /** Google Maps embed URL (Share → Embed a map → src value). Optional. */
  mapsEmbedUrl: clean(env.PUBLIC_MAPS_EMBED_URL),
  social: {
    instagram: clean(env.PUBLIC_INSTAGRAM_URL),
    facebook: clean(env.PUBLIC_FACEBOOK_URL),
    tiktok: clean(env.PUBLIC_TIKTOK_URL),
  },
  listings: {
    booking: clean(env.PUBLIC_BOOKING_URL),
    airbnb: clean(env.PUBLIC_AIRBNB_URL),
  },
  paypalMeUrl: clean(env.PUBLIC_PAYPAL_ME_URL),
  depositPercent: 30,
  ga4Id: clean(env.PUBLIC_GA4_ID),
  /** Travel facts from the documentation. */
  travel: { sjoHours: 4, lirHours: 3 },
} as const;

/** Builds a wa.me link. Returns null when no number is configured. */
export function whatsappUrl(message?: string): string | null {
  if (!site.whatsappNumber) return null;
  const q = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${site.whatsappNumber}${q}`;
}
