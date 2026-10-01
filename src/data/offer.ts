/**
 * Cabins and tours.
 *
 * Names, rooms, amenities and prices confirmed by the owners (30 Sep 2026).
 * All prices are in US dollars with VAT (IVA 13%) included. Cabin prices vary
 * by season, so they are shown as "From …". Set `price: null` to show
 * "Rate on request" instead.
 */
import type { Lang } from '../i18n/routes';

type L = Record<Lang, string>;

export type Currency = 'CRC' | 'USD';

export interface Price {
  amount: number;
  currency: Currency;
  /** Seasonal / starting price → shown as "From …" */
  from?: boolean;
  /** Unit shown after the amount */
  unit: 'night' | 'person' | 'adult';
  /** Extra context next to the unit (e.g. "per couple") */
  basis?: L;
  /** Additional lines (extra guests, children, minimums…) */
  notes?: Record<Lang, string[]>;
}

export interface Cabin {
  slug: string;
  image: string;
  name: L;
  capacity: number;
  capacityNote?: L;
  price: Price | null;
  summary: L;
  description: L;
  features: Record<Lang, string[]>;
}

export const cabins: Cabin[] = [
  {
    slug: 'tenorio',
    image: 'cabin-rustic',
    name: { en: 'Tenorio Cabin', es: 'Cabaña Tenorio' },
    capacity: 7,
    price: {
      amount: 120,
      currency: 'USD',
      from: true,
      unit: 'night',
      basis: { en: 'up to 5 guests', es: 'hasta 5 personas' },
      notes: {
        en: [`${formatMoney(20, 'USD', 'en')} per additional guest (up to 7)`],
        es: [`${formatMoney(20, 'USD', 'es')} por persona adicional (hasta 7)`],
      },
    },
    summary: {
      en: 'Two bedrooms, two bathrooms and a rustic rancho with a wood-fired grill — room for the whole family.',
      es: 'Dos habitaciones, dos baños y un rancho rústico con parrilla de leña: espacio para toda la familia.',
    },
    description: {
      en: 'Our largest cabin is made for gathering. It has two bedrooms, each with a double bed and a bunk bed, two bathrooms (one inside and one by the rancho) and a TV. Its rustic rancho with a wood-fired grill is ready for a family barbecue. It also offers easy access for guests with disabilities.',
      es: 'Nuestra cabaña más grande está hecha para reunirse. Tiene dos habitaciones, cada una con cama matrimonial y camarote, dos baños (uno adentro y otro junto al rancho) y TV. Su rancho rústico con parrilla de leña está listo para una carne asada en familia. Además, tiene fácil acceso para personas con discapacidad.',
    },
    features: {
      en: ['2 bedrooms: double bed + bunk bed in each', '2 bathrooms', 'Rustic rancho with wood-fired grill', 'TV', 'Easy access for guests with disabilities', 'Equipped for cooking', 'Up to 7 guests'],
      es: ['2 habitaciones: cama matrimonial + camarote en cada una', '2 baños', 'Rancho rústico con parrilla de leña', 'TV', 'Fácil acceso para personas con discapacidad', 'Equipada para cocinar', 'Hasta 7 personas'],
    },
  },
  {
    slug: 'colibri',
    image: 'cabin-semirustic',
    name: { en: 'Colibrí Cabin', es: 'Cabaña Colibrí' },
    capacity: 4,
    price: {
      amount: 50,
      currency: 'USD',
      from: true,
      unit: 'night',
      basis: { en: 'per couple', es: 'por pareja' },
      notes: {
        en: [`${formatMoney(20, 'USD', 'en')} per additional guest (up to 4)`],
        es: [`${formatMoney(20, 'USD', 'es')} por persona adicional (hasta 4)`],
      },
    },
    summary: {
      en: 'Two bedrooms and a terrace with chairs facing the forest — ideal for couples and small families.',
      es: 'Dos habitaciones y una terraza con sillas frente al bosque: ideal para parejas y familias pequeñas.',
    },
    description: {
      en: 'This cabin has two bedrooms with a double bed each, a TV, a fridge and hot water. Its terrace, with chairs looking straight into the forest, invites you to slow down and let the sounds of Río Celeste set the pace.',
      es: 'Esta cabaña tiene dos habitaciones con cama matrimonial cada una, TV, refrigeradora y agua caliente. Su terraza, con sillas que miran directo al bosque, te invita a bajar el ritmo y dejar que los sonidos de Río Celeste marquen el paso.',
    },
    features: {
      en: ['2 bedrooms with a double bed', 'Terrace with chairs and forest view', 'TV and fridge', 'Hot water', 'Equipped for cooking', 'Up to 4 guests'],
      es: ['2 habitaciones con cama matrimonial', 'Terraza con sillas y vista al bosque', 'TV y refrigeradora', 'Agua caliente', 'Equipada para cocinar', 'Hasta 4 personas'],
    },
  },
  {
    slug: 'tapir',
    image: 'cabin-accessible',
    name: { en: 'Tapir Cabin', es: 'Cabaña Tapir' },
    capacity: 2,
    capacityNote: { en: '+ sofa bed (possible 3rd guest)', es: '+ sofá cama (posible 3.ª persona)' },
    price: {
      amount: 50,
      currency: 'USD',
      from: true,
      unit: 'night',
      basis: { en: 'per couple', es: 'por pareja' },
    },
    summary: {
      en: 'Accessible design (Costa Rica Law 7600) and a forest view made for birdwatching.',
      es: 'Diseño accesible (Ley 7600) y vista al bosque, perfecta para observar aves.',
    },
    description: {
      en: 'Designed to be accessible for guests with disabilities under Costa Rica’s Law 7600, this cabin has a double bed and a sofa bed for a possible third guest, plus hot water. Its forest view is perfect for anyone who loves birdwatching, from morning coffee to sunset.',
      es: 'Diseñada para ser accesible para personas con discapacidad según la Ley 7600, esta cabaña tiene una cama matrimonial y un sofá cama para una posible tercera persona, además de agua caliente. Su vista al bosque es perfecta para quienes disfrutan observar aves, desde el café de la mañana hasta el atardecer.',
    },
    features: {
      en: ['Double bed + sofa bed', 'Accessible (Law 7600)', 'Forest view, ideal for birdwatching', 'Hot water', 'Equipped for cooking'],
      es: ['Cama matrimonial + sofá cama', 'Accesible (Ley 7600)', 'Vista al bosque, ideal para observar aves', 'Agua caliente', 'Equipada para cocinar'],
    },
  },
];

export interface Tour {
  slug: string;
  image: string;
  name: L;
  hours: number;
  price: Price | null;
  summary: L;
  description: Record<Lang, string[]>;
}

export const tours: Tour[] = [
  {
    slug: 'tubing',
    image: 'tour-tubing',
    name: { en: 'Tubing on Río Celeste', es: 'Tubing en Río Celeste' },
    hours: 2,
    price: { amount: 50, currency: 'USD', unit: 'person' },
    summary: {
      en: 'Float the river with a specialized guide — adventure with the forest all around.',
      es: 'Recorre el río con un guía especializado: aventura con el bosque alrededor.',
    },
    description: {
      en: [
        'Tubing is the most playful way to experience the river. For two hours you float with the current, surrounded by forest, with a specialized guide leading the way.',
        'It is one of those experiences you will keep telling stories about — easy to share with family and friends.',
      ],
      es: [
        'El tubing es la forma más divertida de vivir el río. Durante dos horas te dejas llevar por la corriente, rodeado de bosque, con un guía especializado al frente.',
        'Es una de esas experiencias de las que seguirás contando historias, fácil de compartir en familia o con amigos.',
      ],
    },
  },
  {
    slug: 'chocolate',
    image: 'tour-chocolate',
    name: { en: 'Chocolate Tour', es: 'Tour de Chocolate' },
    hours: 1.5,
    price: {
      amount: 35,
      currency: 'USD',
      unit: 'adult',
      notes: {
        en: [`Children under 10: ${formatMoney(15, 'USD', 'en')}`, `Solo travelers: minimum rate ${formatMoney(70, 'USD', 'en')}`],
        es: [`Menores de 10 años: ${formatMoney(15, 'USD', 'es')}`, `Una sola persona: tarifa mínima de ${formatMoney(70, 'USD', 'es')}`],
      },
    },
    summary: {
      en: 'Discover the journey from cacao to chocolate with a specialized guide.',
      es: 'Descubre el camino del cacao al chocolate con un guía especializado.',
    },
    description: {
      en: [
        'An hour-and-a-half experience to discover how cacao becomes chocolate, guided by a specialist who shares the stories behind every step.',
        'A calm, delicious plan — perfect for a relaxed afternoon.',
      ],
      es: [
        'Una experiencia de hora y media para descubrir cómo el cacao se convierte en chocolate, de la mano de un guía especializado que comparte las historias detrás de cada paso.',
        'Un plan tranquilo y delicioso, perfecto para una tarde relajada.',
      ],
    },
  },
  {
    slug: 'night-walk',
    image: 'tour-night-walk',
    name: { en: 'Night Walk', es: 'Caminata Nocturna' },
    hours: 1.5,
    price: { amount: 40, currency: 'USD', unit: 'person' },
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

export function formatMoney(n: number, currency: Currency, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-CR' : 'en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).format(n);
}
