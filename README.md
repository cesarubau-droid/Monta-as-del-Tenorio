# Montañas del Tenorio — Sitio web

Sitio oficial de **Montañas del Tenorio**: cabañas familiares y tours (tubing, chocolate y caminata nocturna) en Río Celeste, junto al Volcán Tenorio, Costa Rica. Bilingüe (EN/ES), orientado a reservas.

- **Producción:** desplegado en Vercel desde la rama `main`.
- **Fuente de verdad del contenido:** `MONTANAS-DEL-TENORIO-COMPLETE.md` (documentación del proyecto, septiembre 2026).

---

## Tecnologías

| Pieza | Uso |
|---|---|
| [Astro 7](https://astro.build) | Generación de páginas estáticas (HTML + CSS, JavaScript mínimo) |
| `@astrojs/vercel` | Adaptador de Vercel; una sola función serverless (`/api/inquiry`) |
| `@astrojs/sitemap` | `sitemap-index.xml` con alternativas `hreflang` EN/ES |
| CSS propio | Tokens de diseño de la especificación (sin frameworks) |
| `sharp` (dev) | Generar imágenes provisionales y optimizar fotos finales |

Sin fuentes web (fuentes del sistema según la especificación), sin librerías de UI y sin dependencias en el navegador.

## Requisitos

- Node.js **22.12 o superior** (`.nvmrc` → 22)
- npm 10+

## Instalación y ejecución local

```bash
git clone https://github.com/cesarubau-droid/Monta-as-del-Tenorio.git
cd Monta-as-del-Tenorio
npm install
cp .env.example .env      # completa los valores que tengas
npm run dev               # http://localhost:4321
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Genera imágenes provisionales y OG → build de producción (`.vercel/output`) → cabeceras de seguridad |
| `npm run placeholders` | Regenera las imágenes provisionales |
| `npm run optimize-photos` | Prepara las fotografías definitivas (ver abajo) |

## Arquitectura

```
src/
├── pages/
│   ├── [...path].astro      # Router único: todas las páginas EN (/) y ES (/es)
│   ├── api/inquiry.ts       # POST reservas y contacto → Google Sheets → WhatsApp
│   ├── 404.astro            # 404 bilingüe
│   └── robots.txt.ts
├── views/                   # Home, Cabins, Tours, Tour, Pages (galería, contacto, reserva, FAQ, legales…)
├── components/              # Header, Hero, CabinCard, TourCard, GalleryTabs, FaqList, Trust, ReservationForm…
├── layouts/Base.astro       # <head> SEO/OG/hreflang/JSON-LD, tema, header, footer
├── data/
│   ├── site.ts              # Datos de contacto (desde variables de entorno)
│   ├── offer.ts             # Cabañas y tours (precios configurables)
│   ├── content.ts           # FAQ, confianza, sostenibilidad, testimonios
│   ├── legal.ts             # Privacidad, términos, reservas y cancelaciones
│   └── media.ts             # REGISTRO DE IMÁGENES (único lugar para cambiar fotos)
├── i18n/                    # routes.ts (URLs) + ui.ts (textos EN/ES)
├── lib/inquiry.ts           # Validación, almacenamiento y mensaje de WhatsApp
├── scripts/                 # analytics.ts, forms.ts (JS del navegador)
└── styles/global.css        # Tokens de diseño + estilos base
public/images/               # Fotos por sección (los .svg provisionales se generan al compilar)
docs/google-apps-script.gs   # Webhook de Google Sheets
```

**Rutas:** inglés en la raíz (`/cabins`, `/tours/tubing`) y español bajo `/es` (`/es/cabins`). El selector EN/ES del header lleva a la misma página en el otro idioma. Cada página tiene su propio `title`, `description`, `canonical`, `hreflang` y Open Graph en su idioma.

| Página | URL |
|---|---|
| Inicio | `/` |
| Cabañas | `/cabins` |
| Tours | `/tours`, `/tours/tubing`, `/tours/chocolate`, `/tours/night-walk` |
| Galería | `/gallery` |
| Contacto | `/contact` |
| Reserva | `/reserve` (acepta `?cabin=rustic&tour=tubing`) |
| FAQ / Historia / Sostenibilidad | `/faq`, `/story`, `/sustainability` |
| Adelanto PayPal | `/deposit?ref=MT-…&amount=…` (no indexada) |
| Legales | `/privacy`, `/terms`, `/reservations-policy` |

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). Las `PUBLIC_*` se incrustan al compilar → **después de cambiarlas en Vercel hay que volver a desplegar** (Deployments → ⋯ → Redeploy). Si una variable está vacía, el botón correspondiente se oculta.

| Variable | Obligatoria | Ejemplo |
|---|---|---|
| `PUBLIC_SITE_URL` | Sí (con dominio) | `https://www.montanasdeltenorio.com` |
| `PUBLIC_WHATSAPP_NUMBER` | Sí | `506XXXXXXXX` (solo dígitos, con código de país) |
| `PUBLIC_CONTACT_EMAIL` | Recomendada | `reservas@…` |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Sí | `https://script.google.com/macros/s/…/exec` |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | Sí | cadena aleatoria larga |
| `PUBLIC_INSTAGRAM_URL`, `PUBLIC_FACEBOOK_URL`, `PUBLIC_TIKTOK_URL` | Recomendadas | URL del perfil |
| `PUBLIC_BOOKING_URL`, `PUBLIC_AIRBNB_URL` | Opcionales | URL del anuncio |
| `PUBLIC_MAPS_URL`, `PUBLIC_MAPS_EMBED_URL` | Opcionales | Enlace / embed de Google Maps |
| `PUBLIC_PAYPAL_ME_URL` | Para adelantos | `https://paypal.me/usuario` |
| `PUBLIC_GA4_ID` | Opcional | `G-XXXXXXXXXX` |

## Flujo de reservas (MVP)

```
Formulario (/reserve) ─► /api/inquiry ─► Google Sheets (pestaña Reservations)
                                   └──► Mensaje de WhatsApp prellenado con todos los datos y la referencia MT-AAMMDD-XXXX
Dueños confirman disponibilidad por WhatsApp ─► envían enlace de adelanto del 30 % (PayPal)
```

- Validación en el navegador **y** en el servidor, honeypot anti-spam, límite de envíos por IP, protección contra fórmulas en Sheets.
- Funciona sin JavaScript (el formulario hace POST normal y redirige a WhatsApp).
- Si Google Sheets falla o no está configurado, la reserva **no se pierde**: el visitante continúa por WhatsApp con todos los datos. El formulario de contacto muestra un error si no puede guardarse.
- **Escalar a calendario:** el almacenamiento está aislado en `storeInquiry()` (`src/lib/inquiry.ts`). Para un sistema de disponibilidad se reemplaza esa función (o el formulario de `ReservationForm.astro`) sin tocar el resto del sitio.

### Google Sheets

1. Crea una hoja nueva en Google Sheets (p. ej. "Reservas Montañas del Tenorio").
2. **Extensiones → Apps Script**, borra el contenido y pega [`docs/google-apps-script.gs`](docs/google-apps-script.gs). Guarda.
3. ⚙ **Configuración del proyecto → Propiedades de la secuencia de comandos**:
   - `WEBHOOK_SECRET` = una cadena aleatoria larga (la misma que irá en Vercel).
   - `NOTIFY_EMAIL` = (opcional) correo que recibe un aviso por cada solicitud.
4. **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: *Yo*. Acceso: *Cualquier persona*. Autoriza los permisos.
5. Copia la URL `…/exec` → `GOOGLE_SHEETS_WEBHOOK_URL` en Vercel; el secreto → `GOOGLE_SHEETS_WEBHOOK_SECRET`. Redeploy.
6. Prueba enviando una reserva: aparecerá en la pestaña **Reservations** con estado "Nuevo". Las columnas `status`, `depositSent` y `notes` son para uso interno.

> Si cambias el código del Apps Script, crea una **nueva versión** de la implementación (Implementar → Administrar implementaciones → editar → Nueva versión) para que la URL siga funcionando.

### WhatsApp

Define `PUBLIC_WHATSAPP_NUMBER` con el número del negocio en formato internacional, solo dígitos (Costa Rica: `506` + 8 dígitos). Se usa en el botón flotante, la sección de contacto, las páginas de tours y el mensaje final de la reserva (`https://wa.me/<número>?text=…`).

### PayPal (adelanto del 30 %)

1. Crea o activa tu enlace en <https://www.paypal.com/paypalme/> y define `PUBLIC_PAYPAL_ME_URL` (p. ej. `https://paypal.me/montanasdeltenorio`).
2. Tras confirmar disponibilidad por WhatsApp, envía al cliente:
   `https://<tu-dominio>/deposit?ref=MT-260930-AB12&amount=120`
   La página muestra la referencia, el monto y el botón **Pagar con PayPal** (`paypal.me/<usuario>/120USD`).
3. Alternativa: enviar directamente una factura o solicitud de pago desde PayPal. El sitio nunca maneja datos de pago.

## Analítica

Los botones y formularios emiten eventos a `window.dataLayer` (compatible con Google Tag Manager) y a GA4 si `PUBLIC_GA4_ID` está definido. Sin ID no se carga ningún script externo.

Eventos: `whatsapp_click`, `reservation_start`, `reservation_form_start`, `reservation_submit`, `contact_form_start`, `contact_submit`, `contact_click`, `email_click`, `cabin_click`, `tour_click`, `social_click`, `map_click`, `deposit_click`, `language_switch`. Para agregar uno: atributo `data-track="nombre"` (+ `data-track-*` para parámetros).

En GA4 marca `reservation_submit`, `contact_submit` y `whatsapp_click` como **eventos clave** (Administrar → Eventos).

## Fotografías: reemplazar las imágenes provisionales

Todas las imágenes actuales son **ilustraciones provisionales** (SVG generados, marcados "Imagen provisional · Provisional image"). No son fotografías de Montañas del Tenorio. La estructura ya está lista: tamaños, proporciones (`aspect-ratio`), recortes (`object-fit: cover`) y `alt` están definidos, así que las fotos se cambian sin rediseñar.

Cada imagen tiene un **id** en [`src/data/media.ts`](src/data/media.ts), que también incluye un `brief` con lo que debe mostrar la foto:

| Sección | ids | Proporción |
|---|---|---|
| Hero (carrusel) | `hero-forest-river`, `hero-cabin-couple`, `hero-family-tubing`, `hero-wildlife` | 16:9 |
| Historia | `founders`, `lookout` | 4:3 |
| Cabañas | `cabin-rustic`, `cabin-semirustic`, `cabin-accessible` | 3:2 |
| Tours | `tour-tubing`, `tour-chocolate`, `tour-night-walk` | 3:2 |
| Galería | `forest-1…4`, `river-1…4`, `wildlife-1…4`, `guides-1…4` | 4:3 |

**Pasos:**

1. Crea la carpeta `photos/` en la raíz (está en `.gitignore`) y copia los originales con el id como nombre: `photos/cabin-rustic.jpg`, `photos/hero-forest-river.jpg`, …
2. `npm run optimize-photos` → genera en `public/images/<sección>/` los archivos `<id>.jpg`, `<id>-800.webp` y `<id>-1600.webp`, recortados a la proporción correcta.
3. En `src/data/media.ts`, para cada foto nueva cambia la entrada a:
   ```ts
   ['cabin-rustic', { src: '/images/cabins/cabin-rustic.jpg', width: 1200, height: 800,
     placeholder: false, optimized: true, brief: '…',
     alt: { en: 'Rustic wooden cabin surrounded by forest', es: 'Cabaña rústica de madera rodeada de bosque' } }],
   ```
   (o reemplaza la llamada `ph(...)` por un objeto así). `alt` descriptivo, menos de 125 caracteres.
4. Commit (incluye los `.jpg`/`.webp` nuevos de `public/images/`) → push → Vercel despliega solo. Los `.svg` provisionales se generan en cada build y no se versionan, así que no hace falta borrarlos.

La nota "Imagen provisional" del hero y de la galería desaparece automáticamente cuando ninguna imagen de esa sección es provisional. El logo también es provisional: reemplázalo en `src/components/Logo.astro` y `public/favicon.svg`.

## GitHub y Vercel

- Repositorio: `cesarubau-droid/Monta-as-del-Tenorio`, rama estable `main`.
- Vercel: proyecto importado desde GitHub. `main` → **Production**; cualquier otra rama o Pull Request → **Preview** con su propia URL.
- Framework preset: **Astro** (detectado). Build command: `npm run build`. Output: automático (`.vercel/output`). Node: 22.x.
- Flujo de trabajo: crea una rama → PR → revisa el Preview → merge a `main` → producción.

### Dominio

Vercel → Project → **Settings → Domains → Add** → escribe el dominio → configura en tu proveedor DNS los registros que indique Vercel (normalmente `A 76.76.21.21` para el dominio raíz y `CNAME cname.vercel-dns.com` para `www`). Luego define `PUBLIC_SITE_URL=https://tu-dominio` y redeploy (canonical, sitemap y Open Graph usan esa URL).

## Calidad verificada

- Lighthouse (móvil y escritorio): Performance 99–100, Accesibilidad 100, Buenas prácticas 100, SEO 100.
- axe-core (WCAG 2.1 A/AA + best practices) en 18 páginas, claro/oscuro, móvil/escritorio: 0 violaciones.
- Sin scroll horizontal de 320 px a 1366 px; zoom 200 % correcto; navegación completa por teclado; `prefers-reduced-motion` desactiva el autoplay y las animaciones.

## Contenido pendiente de los dueños

Nada de esto se inventó; el sitio muestra una alternativa neutral hasta que se complete:

- **Precios** de cabañas y tours → `priceUSD` en `src/data/offer.ts` (hoy: "Tarifa a consultar").
- **Testimonios reales** → `testimonials` en `src/data/content.ts` (la sección aparece sola al agregarlos).
- **ICT, Tripadvisor y calificaciones** de Booking/Airbnb → `trustBadges` en `src/data/content.ts` (`enabled: true`, `rating`).
- **Condiciones de cancelación/reembolso** y pago del saldo → `src/data/legal.ts` (`policy`).
- **Historia de los fundadores** (textos más personales) → `about` en `src/i18n/ui.ts`.
- Capacidad máxima por tour, edades mínimas, qué incluye cada tour → `src/data/offer.ts` y FAQ.
- Revisar los textos de sostenibilidad (`src/data/content.ts`) y legales.

## Mantenimiento

- Textos de interfaz: `src/i18n/ui.ts` (siempre en ambos idiomas).
- Cabañas/tours/FAQ: `src/data/*.ts`.
- Colores, tipografía y espaciado: variables en `src/styles/global.css`.
- Dependencias: `npm outdated` y `npm audit` cada pocos meses; probar con `npm run build` antes de subir.
