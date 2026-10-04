/**
 * FAQ, trust, sustainability and testimonials.
 * Only information supported by the documentation. Items that need
 * verification are kept here but disabled (see `enabled`).
 */
import type { Lang } from '../i18n/routes';
import { site } from './site';

type L = Record<Lang, string>;

export interface Faq {
  id: string;
  q: L;
  a: L;
  /** Shown in the home page FAQ block (doc: tours, season, kids, kitchen, cancellation). */
  home?: boolean;
}

const p = site.depositPercent;

export const faqs: Faq[] = [
  {
    id: 'tours-included',
    home: true,
    q: { en: 'What is included in the tours?', es: '¿Qué incluyen los tours?' },
    a: {
      en: 'Every tour — tubing (2 h), chocolate (1.5 h) and night walk (1.5 h) — is led by a specialized guide. Tours are booked separately from the cabins; tell us which ones you like and we will confirm details and availability by WhatsApp.',
      es: 'Todos los tours —tubing (2 h), chocolate (1,5 h) y caminata nocturna (1,5 h)— se realizan con un guía especializado. Se reservan aparte de las cabañas; cuéntanos cuáles te interesan y te confirmamos detalles y disponibilidad por WhatsApp.',
    },
  },
  {
    id: 'best-time',
    home: true,
    q: { en: 'When is the best time to visit?', es: '¿Cuál es la mejor época para visitar?' },
    a: {
      en: 'Most guests stay 2–3 days, which is ideal to enjoy the forest, the river and a couple of tours without rushing. Write to us with your dates and we will share what to expect during your visit.',
      es: 'La mayoría de nuestros huéspedes se queda de 2 a 3 días, ideal para disfrutar del bosque, el río y un par de tours sin prisa. Escríbenos con tus fechas y te contamos qué esperar durante tu visita.',
    },
  },
  {
    id: 'kids',
    home: true,
    q: { en: 'Can we come with children?', es: '¿Podemos ir con niños?' },
    a: {
      en: 'Yes, families are very welcome — the Tenorio Cabin sleeps up to 7 guests. Include the number of children in your request so we can recommend the best cabin and tours for your family.',
      es: 'Sí, las familias son muy bienvenidas: la Cabaña Tenorio recibe hasta 7 personas. Indica el número de niños en tu solicitud para recomendarte la mejor cabaña y los tours más adecuados.',
    },
  },
  {
    id: 'kitchen',
    home: true,
    q: { en: 'Can we cook in the cabins?', es: '¿Podemos cocinar en las cabañas?' },
    a: {
      en: 'Yes. All cabins are equipped for cooking and you are welcome to bring your own food. Breakfast is also available as a separate service.',
      es: 'Sí. Todas las cabañas están equipadas para cocinar y puedes traer tus propios alimentos. El desayuno también está disponible como servicio aparte.',
    },
  },
  {
    id: 'cancellation',
    home: true,
    q: { en: 'How do reservations and cancellations work?', es: '¿Cómo funcionan las reservas y cancelaciones?' },
    a: {
      en: `Send us a reservation request, we confirm availability by WhatsApp and then send a PayPal link for a ${p}% deposit that confirms your booking. Cancellation conditions are shared with you in writing before you pay — see Reservations & Cancellations.`,
      es: `Envía tu solicitud de reserva, confirmamos la disponibilidad por WhatsApp y luego te enviamos un enlace de PayPal para un adelanto del ${p}% que confirma tu reserva. Las condiciones de cancelación se te comparten por escrito antes del pago; consulta Reservas y Cancelaciones.`,
    },
  },
  {
    id: 'getting-here',
    q: { en: 'How do I get to Montañas del Tenorio?', es: '¿Cómo llego a Montañas del Tenorio?' },
    a: {
      en: `We are in Río Celeste, next to Tenorio Volcano — about ${site.travel.lirHours} hours from Liberia Airport (LIR) and ${site.travel.sjoHours} hours from Juan Santamaría Airport (SJO). Access is easy for any type of vehicle.`,
      es: `Estamos en Río Celeste, junto al Volcán Tenorio, a unas ${site.travel.lirHours} horas del Aeropuerto de Liberia (LIR) y ${site.travel.sjoHours} horas del Aeropuerto Juan Santamaría (SJO). El acceso es fácil para cualquier tipo de vehículo.`,
    },
  },
  {
    id: 'availability',
    q: { en: 'How can I check availability?', es: '¿Cómo consulto la disponibilidad?' },
    a: {
      en: 'Availability is shared privately. Send the reservation form or message us on WhatsApp with your dates and number of guests.',
      es: 'La disponibilidad se comparte de forma privada. Envía el formulario de reserva o escríbenos por WhatsApp con tus fechas y número de personas.',
    },
  },
  {
    id: 'accessible',
    q: { en: 'Do you have an accessible cabin?', es: '¿Tienen una cabaña accesible?' },
    a: {
      en: 'Yes. The Tapir Cabin is designed to be accessible for guests with disabilities under Costa Rica’s Law 7600. It sleeps 2, plus a sofa bed for a possible third guest. The Tenorio Cabin also offers easy access for guests with disabilities.',
      es: 'Sí. La Cabaña Tapir está diseñada para ser accesible para personas con discapacidad según la Ley 7600. Es para 2 personas, más un sofá cama para una posible tercera. La Cabaña Tenorio también tiene fácil acceso para personas con discapacidad.',
    },
  },
  {
    id: 'packages',
    q: { en: 'Are tours included with the cabins?', es: '¿Los tours están incluidos con las cabañas?' },
    a: {
      en: 'Not at the moment — cabins and tours are booked separately, so you can build the trip you want. Add the tours you like in the reservation form.',
      es: 'Por ahora no: cabañas y tours se reservan por separado, así armas el viaje que quieras. Agrega los tours que te interesen en el formulario de reserva.',
    },
  },
];

/**
 * Trust badges. Only verified data: Booking, Airbnb and Tripadvisor listings
 * (links come from env vars) and the Airbnb rating read from the public
 * listing on 30 Sep 2026 — update rating/reviewCount when they change.
 * ICT stays disabled until the owners confirm it.
 */
export interface TrustBadge {
  id: string;
  label: string;
  kind: 'listing' | 'certification' | 'award';
  enabled: boolean;
  url: string | null;
  /** Verified average rating (e.g. 4.88). null = don't show. */
  rating: number | null;
  /** Number of reviews behind the rating. */
  reviewCount?: number;
}

export const trustBadges: TrustBadge[] = [
  { id: 'airbnb', label: 'Airbnb', kind: 'listing', enabled: true, url: site.listings.airbnb, rating: 4.88, reviewCount: 57 },
  { id: 'tripadvisor', label: 'Tripadvisor', kind: 'listing', enabled: true, url: site.listings.tripadvisor, rating: null },
  { id: 'booking', label: 'Booking.com', kind: 'listing', enabled: true, url: site.listings.booking, rating: null },
  { id: 'ict', label: 'ICT', kind: 'certification', enabled: false, url: null, rating: null },
];

/** Facts that build trust, all from the documentation. */
export const trustFacts: { icon: string; text: L }[] = [
  { icon: 'home', text: { en: 'Family-run', es: 'Negocio familiar' } },
  { icon: 'compass', text: { en: 'Specialized guides on every tour', es: 'Guías especializados en cada tour' } },
  { icon: 'access', text: { en: 'Accessible cabin (Law 7600)', es: 'Cabaña accesible (Ley 7600)' } },
];

export const sustainability: { id: string; icon: string; title: L; text: L }[] = [
  {
    id: 'forest',
    icon: 'leaf',
    title: { en: 'Forest protection', es: 'Protección del bosque' },
    text: {
      en: 'We keep the forest around the cabins as intact as possible — it is the reason this place exists.',
      es: 'Mantenemos el bosque alrededor de las cabañas tan intacto como es posible: es la razón de ser de este lugar.',
    },
  },
  {
    id: 'local',
    icon: 'people',
    title: { en: 'Local employment', es: 'Empleo local' },
    text: {
      en: 'We are a family business rooted in these mountains, and we work with people from our community.',
      es: 'Somos un negocio familiar con raíces en estas montañas y trabajamos con personas de nuestra comunidad.',
    },
  },
  {
    id: 'waste',
    icon: 'recycle',
    title: { en: 'Toward zero waste', es: 'Hacia cero residuos' },
    text: {
      en: 'We aim to reduce waste in everything we do, and we ask our guests to help us leave no trace.',
      es: 'Buscamos reducir los residuos en todo lo que hacemos y pedimos a nuestros huéspedes que nos ayuden a no dejar rastro.',
    },
  },
];

/**
 * Guest reviews — ONLY real reviews copied from the public listings
 * (Airbnb, Tripadvisor, Booking.com, Google). Keep the text exactly as the
 * guest wrote it, in its original language (`lang`). The reviews block in the
 * "Book with confidence" section stays hidden while this list is empty.
 * Shape: { text: '…', lang: 'es', name: 'Ana', from: 'Canadá', date: '2026-08', rating: 5, source: 'airbnb' }
 */
export type ReviewSource = 'airbnb' | 'tripadvisor' | 'booking' | 'google';
export interface Review {
  text: string;
  lang: Lang;
  name: string;
  from?: string;
  /** YYYY-MM */
  date?: string;
  rating?: number;
  source: ReviewSource;
  /** Original language when the text shown is the platform's own translation. */
  translatedFrom?: 'en' | 'fr' | 'de' | 'pt';
}
/**
 * Real reviews from the Airbnb listing (export of 2 Oct 2026, public comments only).
 * Airbnb exports them already translated to Spanish; the text is kept exactly as exported.
 * Shown in the reviews carousel, in this order. Picked: 5 stars, no mention of
 * breakfast being included (breakfast is a separate service), no complaints.
 */
export const reviews: Review[] = [
  {
    text: "Excelente estancia para nuestra familia de 5 en este alojamiento de troncos de madera. Muy rústico. A pocos minutos del parque Tenorio y de la cascada Río Celeste. Muy buena comunicación con nuestro anfitrión, que incluso nos llevó a ver la salida de la luna y las luciérnagas, ¡y nos bañamos en el río de su propiedad! ¡Gracias por todo! También nos encantaron los colibríes y los perros muy amigables. ¡En resumen, fue genial!",
    lang: 'es', name: 'Chrystèle', date: '2025-08', rating: 5, source: 'airbnb', translatedFrom: 'fr',
  },
  {
    text: "¡Nos encantó nuestra estancia! ¡El lugar es exactamente como se muestra en la foto y está en una ubicación excelente! Solo estuvimos allí una noche, pero nos hubiera gustado quedarnos más tiempo. ¡Qué propiedad tan hermosa!",
    lang: 'es', name: 'Chelsea', date: '2026-07', rating: 5, source: 'airbnb', translatedFrom: 'en',
  },
  {
    text: "Hermosa casa y patio con mucho carácter. Lo mejor de todo fue la caminata de 5 minutos hasta el Río Celeste a través de la propiedad de los dueños. Había muchas aves. ¡Excelente estadía!",
    lang: 'es', name: 'Betsy', date: '2026-04', rating: 5, source: 'airbnb', translatedFrom: 'en',
  },
  {
    text: "Preciosa casa de campo con un jardín fantástico y un lugar para nadar en el Río Celeste.",
    lang: 'es', name: 'Laurens', date: '2026-03', rating: 5, source: 'airbnb', translatedFrom: 'en',
  },
  {
    text: "Un lugar muy bello y tranquilo. A escasos 300 mts del Río Celeste y con una entrada privada al río.",
    lang: 'es', name: 'David', date: '2025-06', rating: 5, source: 'airbnb',
  },
  {
    text: "Lo pasamos de maravilla. La cabaña era exactamente lo que estábamos buscando. La anfitriona hizo todo lo posible para que nos sintiéramos como en casa y nos mostró la hermosa propiedad. El río está a solo unos minutos a pie a través de un hermoso sendero en su propiedad. Nuestra estancia fue todo lo que podíamos haber pedido. Sin dudas volveremos!",
    lang: 'es', name: 'Michelle', date: '2024-06', rating: 5, source: 'airbnb', translatedFrom: 'en',
  },
  {
    text: "Nos encantó nuestra estancia aquí. Iliana fue una anfitriona amable y muy atenta, y nos hizo sentir como en casa. Está ubicado en unas tierras de cultivo impresionantes, y durante nuestra estancia allí vimos ranas venenosas, perezosos y aves increíbles. Se encuentra a unos 10 minutos del parque nacional y de algunos restaurantes excelentes, pero la cocina también es fácil de usar. Excelente lugar para hospedarnos en familia y sin duda nos hospedaremos allí de nuevo cuando volvamos a la zona.",
    lang: 'es', name: 'Devon', date: '2023-04', rating: 5, source: 'airbnb', translatedFrom: 'en',
  },
  {
    text: "Decidimos pasar nuestros últimos dos días en el volcán Tenorio, sin saber nada sobre él. Tuvimos la suerte de encontrar este tesoro. La cabaña de Xinia está en una hermosa propiedad y granja. Ha plantado las flores y los arbustos con un ojo artístico y como un regalo para los huéspedes. Hay colibríes a pocos metros de ti en el porche, deleitándose con las flores. Ella y su familia son el epítome de la hospitalidad y la amabilidad. Nos enamoramos de la zona y de la comunidad, y esperamos volver pronto.",
    lang: 'es', name: 'Jenna', date: '2022-07', rating: 5, source: 'airbnb', translatedFrom: 'en',
  },
  {
    text: "Excepcional. Un pequeño paraíso. Nos hubiera gustado quedarnos más tiempo.",
    lang: 'es', name: 'Sebastien', date: '2022-07', rating: 5, source: 'airbnb', translatedFrom: 'fr',
  },
  {
    text: "¡Fue una estadía absolutamente increíble! ¡Desde el paisaje hasta el perezoso que vive en el patio trasero! ¡Todo sobre esta estancia fue perfecto! La hospitalidad del anfitrión fue perfecta y fue muy amable y acogedor. ¡Recomendaría este lugar a cualquiera que quiera pasar tiempo en Costa Rica! ¡Sinceramente, no tengo nada negativo que decir!",
    lang: 'es', name: 'Jamison', date: '2022-05', rating: 5, source: 'airbnb', translatedFrom: 'en',
  },
  {
    text: "¡Ojalá hubiéramos planeado pasar más tiempo en la zona, porque esta cabaña es simplemente preciosa! Un lugar fabuloso para relajarse después de hacer senderismo, y también se puede observar a un perezoso que vive allí. En general, la comunicación fue excelente y, gracias a las indicaciones que nos proporcionaron, no tuvimos problemas para encontrar el lugar. ¡Me hospedaría aquí de nuevo!",
    lang: 'es', name: 'Robin', date: '2022-04', rating: 5, source: 'airbnb', translatedFrom: 'en',
  },
  {
    text: "Nada que objetar, salvo que no hay que dudar en alojarse allí. El lugar es mágico y tranquilo. No duden en pedirle a Xinia el queso fresco que elabora... Está delicioso. Volveremos tan pronto como sea posible.",
    lang: 'es', name: 'Karl', date: '2022-01', rating: 5, source: 'airbnb', translatedFrom: 'fr',
  },
];
