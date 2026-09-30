export const languages = ['en', 'es'] as const;
export type Lang = (typeof languages)[number];
export const defaultLang: Lang = 'en';

/** Page keys → URL segment (identical in both languages; ES lives under /es). */
export const routes = {
  home: '',
  cabins: 'cabins',
  tours: 'tours',
  gallery: 'gallery',
  contact: 'contact',
  reserve: 'reserve',
  faq: 'faq',
  story: 'story',
  sustainability: 'sustainability',
  deposit: 'deposit',
  privacy: 'privacy',
  terms: 'terms',
  policy: 'reservations-policy',
} as const;
export type RouteKey = keyof typeof routes;

/** Localized URL for a page key, e.g. url('es', 'cabins') → /es/cabins */
export function url(lang: Lang, key: RouteKey, sub = ''): string {
  const parts = [lang === defaultLang ? '' : lang, routes[key], sub].filter(Boolean);
  return '/' + parts.join('/');
}

/** Same path in the other language. */
export function switchLangPath(pathname: string, target: Lang): string {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const bare = clean.replace(/^\/es(?=\/|$)/, '') || '/';
  if (target === defaultLang) return bare;
  return bare === '/' ? '/es' : `/es${bare}`;
}
