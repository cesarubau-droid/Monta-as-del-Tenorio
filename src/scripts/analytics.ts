/**
 * Conversion tracking.
 *
 * Any element with data-track="event_name" sends that event on click. Extra
 * data-track-* attributes become event parameters
 * (data-track-location="hero" → { location: 'hero' }).
 *
 * Events: whatsapp_click, reservation_start, reservation_submit,
 * contact_submit, contact_click, email_click, cabin_click, tour_click,
 * social_click, language_switch.
 *
 * Every event is pushed to window.dataLayer (works with GTM) and forwarded to
 * GA4 when PUBLIC_GA4_ID is configured. Nothing is sent without an ID.
 */
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: string, params: Record<string, unknown> = {}): void {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
  if (typeof window.gtag === 'function') window.gtag('event', event, params);
  if (import.meta.env.DEV) console.debug('[track]', event, params);
}

export function initClickTracking(): void {
  document.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-track]');
    if (!el) return;
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(el.dataset)) {
      if (k.startsWith('track') && k !== 'track' && v) params[k.charAt(5).toLowerCase() + k.slice(6)] = v;
    }
    track(el.dataset.track as string, params);
  });
}
