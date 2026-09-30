/**
 * Cabins and tours — facts come ONLY from the official documentation.
 *
 * Prices: the documentation says prices are visible on the site but does not
 * define amounts. Set `priceUSD` (number) when the owners confirm them; while
 * it is null the site shows "Rate on request".
 */
import type { Lang } from '../i18n/routes';

type L = Record<Lang, string>;

export interface Cabin {
  slug: string;
  image: string;
  name: L;
  capacity: number;
  capacityNote?: L;
  priceUSD: number | null;
  summary: L;
  description: L;
  features: Record<Lang, string[]>;
}

export const cabins: Cabin[] = [
  {
    slug: 'rustic',
    image: 'cabin-rustic',
    name: { en: 'Rustic Cabin', es: 'Cabaña Rústica' },
    capacity: 7,
    priceUSD: null,
    summary: {
      en: 'Built entirely of wood and wrapped in forest views — room for the whole family.',
      es: 'Construida totalmente en madera y rodeada de vistas al bosque: espacio para toda la familia.',
    },
    description: {
      en: 'Our 100% rustic wooden cabin is made for gathering. With space for up to seven guests and everything you need to cook, it is the place to share long breakfasts, slow afternoons and nights listening to the forest.',
      es: 'Nuestra cabaña 100% rústica de madera está hecha para reunirse. Con espacio para hasta siete personas y todo lo necesario para cocinar, es el lugar para compartir desayunos largos, tardes tranquilas y noches escuchando el bosque.',
    },
    features: {
      en: ['100% rustic wood', 'Forest view', 'Equipped for cooking', 'Up to 7 guests'],
      es: ['100% rústica de madera', 'Vista al bosque', 'Equipada para cocinar', 'Hasta 7 personas'],
    },
  },
  {
    slug: 'semi-rustic',
    image: 'cabin-semirustic',
    name: { en: 'Semi-Rustic Cabin', es: 'Cabaña Semirrústica' },
    capacity: 4,
    priceUSD: null,
    summary: {
      en: 'Wooden exterior and a terrace facing the forest — ideal for couples and small families.',
      es: 'Exterior de madera y una terraza frente al bosque: ideal para parejas y familias pequeñas.',
    },
    description: {
      en: 'With its wooden exterior and a terrace that looks straight into the forest, this cabin for up to four guests invites you to slow down. Cook your own meals, read on the terrace and let the sounds of Río Celeste set the pace.',
      es: 'Con su exterior de madera y una terraza que mira directo al bosque, esta cabaña para hasta cuatro personas te invita a bajar el ritmo. Cocina tus comidas, lee en la terraza y deja que los sonidos de Río Celeste marquen el paso.',
    },
    features: {
      en: ['Wooden exterior', 'Terrace with forest view', 'Equipped for cooking', 'Up to 4 guests'],
      es: ['Exterior de madera', 'Terraza con vista al bosque', 'Equipada para cocinar', 'Hasta 4 personas'],
    },
  },
  {
    slug: 'accessible',
    image: 'cabin-accessible',
    name: { en: 'Accessible Cabin', es: 'Cabaña Accesible' },
    capacity: 2,
    capacityNote: { en: '+ sofa bed (possible 3rd guest)', es: '+ sofá cama (posible 3.ª persona)' },
    priceUSD: null,
    summary: {
      en: 'Accessible design (Costa Rica Law 7600) and a terrace made for birdwatching.',
      es: 'Diseño accesible (Ley 7600) y una terraza ideal para el avistamiento de aves.',
    },
    description: {
      en: 'Designed to be accessible for guests with disabilities under Costa Rica’s Law 7600, this cabin sleeps two, with a sofa bed for a possible third guest. Its forest-view terrace is ideal for birdwatching from morning coffee to sunset.',
      es: 'Diseñada para ser accesible para personas con discapacidad según la Ley 7600, esta cabaña es para dos personas, con sofá cama para una posible tercera. Su terraza con vista al bosque es ideal para observar aves desde el café de la mañana hasta el atardecer.',
    },
    features: {
      en: ['Accessible (Law 7600)', 'Terrace for birdwatching', 'Forest view', 'Equipped for cooking'],
      es: ['Accesible (Ley 7600)', 'Terraza para avistamiento de aves', 'Vista al bosque', 'Equipada para cocinar'],
    },
  },
];

export interface Tour {
  slug: string;
  image: string;
  name: L;
  hours: number;
  priceUSD: number | null;
  summary: L;
  description: Record<Lang, string[]>;
}

export const tours: Tour[] = [
  {
    slug: 'tubing',
    image: 'tour-tubing',
    name: { en: 'Tubing on Río Celeste', es: 'Tubing en Río Celeste' },
    hours: 1.5,
    priceUSD: null,
    summary: {
      en: 'Float the river with a specialized guide — adventure with the forest all around.',
      es: 'Recorre el río con un guía especializado: aventura con el bosque alrededor.',
    },
    description: {
      en: [
        'Tubing is the most playful way to experience the river. For an hour and a half you float with the current, surrounded by forest, with a specialized guide leading the way.',
        'It is one of those experiences you will keep telling stories about — easy to share with family and friends.',
      ],
      es: [
        'El tubing es la forma más divertida de vivir el río. Durante hora y media te dejas llevar por la corriente, rodeado de bosque, con un guía especializado al frente.',
        'Es una de esas experiencias de las que seguirás contando historias, fácil de compartir en familia o con amigos.',
      ],
    },
  },
  {
    slug: 'chocolate',
    image: 'tour-chocolate',
    name: { en: 'Chocolate Tour', es: 'Tour de Chocolate' },
    hours: 2,
    priceUSD: null,
    summary: {
      en: 'Discover the journey from cacao to chocolate with a specialized guide.',
      es: 'Descubre el camino del cacao al chocolate con un guía especializado.',
    },
    description: {
      en: [
        'A two-hour experience to discover how cacao becomes chocolate, guided by a specialist who shares the stories behind every step.',
        'A calm, delicious plan — perfect for a relaxed afternoon.',
      ],
      es: [
        'Una experiencia de dos horas para descubrir cómo el cacao se convierte en chocolate, de la mano de un guía especializado que comparte las historias detrás de cada paso.',
        'Un plan tranquilo y delicioso, perfecto para una tarde relajada.',
      ],
    },
  },
  {
    slug: 'night-walk',
    image: 'tour-night-walk',
    name: { en: 'Night Walk', es: 'Caminata Nocturna' },
    hours: 1.5,
    priceUSD: null,
    summary: {
      en: 'See the forest wake up after dark on a guided night walk.',
      es: 'Mira cómo despierta el bosque de noche en una caminata guiada.',
    },
    description: {
      en: [
        'When the sun sets, the forest changes. On this hour-and-a-half walk a specialized guide helps you discover the nocturnal life that hides during the day.',
        'Quiet steps, a flashlight and plenty of curiosity — an authentic Costa Rican experience.',
      ],
      es: [
        'Cuando se oculta el sol, el bosque cambia. En esta caminata de hora y media, un guía especializado te ayuda a descubrir la vida nocturna que se esconde durante el día.',
        'Pasos silenciosos, una linterna y mucha curiosidad: una experiencia auténtica de Costa Rica.',
      ],
    },
  },
];

export function formatHours(h: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-CR' : 'en-US', { maximumFractionDigits: 1 }).format(h);
}

export function formatUSD(n: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-CR' : 'en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}
