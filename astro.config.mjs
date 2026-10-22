// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// Canonical site URL. Set PUBLIC_SITE_URL once the custom domain is live.
const site =
  process.env.PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:4321');

export default defineConfig({
  site,
  output: 'static',
  adapter: vercel(),
  // Every URL ends in "/" so canonical, hreflang and sitemap agree.
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  // CSP as a <meta> tag with hashes of every script and style Astro renders.
  // Google Analytics (loaded only after cookie consent) is the one external script.
  security: {
    csp: {
      directives: ["object-src 'none'", "base-uri 'self'"],
      scriptDirective: { resources: ["'self'", 'https://www.googletagmanager.com'] },
    },
  },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      filter: (page) => !/\/(deposit|404)\/?$/.test(page),
      i18n: { defaultLocale: 'en', locales: { en: 'en-US', es: 'es-CR' } },
    }),
  ],
});
