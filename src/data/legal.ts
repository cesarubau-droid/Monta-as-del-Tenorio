/**
 * Legal pages. Neutral texts that describe how this website actually works.
 * OWNER REVIEW PENDING: specific cancellation/refund conditions were not
 * defined in the documentation — complete `policy` when they are decided,
 * and have the texts reviewed by a professional if needed.
 */
import type { Lang } from '../i18n/routes';
import { site } from './site';

export interface LegalDoc { updated: string; sections: { h: string; p: string[] }[] }
const p = site.depositPercent;
const contactLine = {
  en: 'You can reach us through the contact form, by WhatsApp' + (site.email ? ` or at ${site.email}` : '') + '.',
  es: 'Puedes escribirnos desde el formulario de contacto, por WhatsApp' + (site.email ? ` o a ${site.email}` : '') + '.',
};

export const legal: Record<'privacy' | 'terms' | 'policy', Record<Lang, LegalDoc>> = {
  privacy: {
    en: {
      updated: '2026-09-30',
      sections: [
        { h: 'Who we are', p: ['Montañas del Tenorio is a family-run lodging and tours business in Río Celeste, Costa Rica. This policy explains how we handle the personal data you send through this website.'] },
        { h: 'What we collect', p: ['When you use the reservation or contact form we receive the details you enter: name, email, phone/WhatsApp, country, travel dates, number of guests, cabin and tour preferences and your message.'] },
        { h: 'Why we use it', p: ['Only to answer your request, confirm availability, manage your reservation and send you the deposit link when you ask for it. We do not sell your data or use it for unrelated advertising.'] },
        { h: 'Where it is stored', p: ['Requests are recorded in a private Google Sheet managed by Montañas del Tenorio. The website is hosted on Vercel. Conversations continue on WhatsApp and deposits are processed by PayPal, under their own privacy policies.'] },
        { h: 'Analytics', p: ['If website analytics are enabled, we measure anonymous usage (pages visited and clicks on buttons such as WhatsApp or Reserve) to improve the site. Your theme preference (light/dark) is stored only in your browser.'] },
        { h: 'Your rights', p: ['You may ask us to access, correct or delete your personal data at any time, in line with Costa Rica’s Law No. 8968 on the Protection of Personal Data. ' + contactLine.en] },
        { h: 'Retention', p: ['We keep your data only as long as needed to handle your request and reservation and to meet legal obligations.'] },
      ],
    },
    es: {
      updated: '2026-09-30',
      sections: [
        { h: 'Quiénes somos', p: ['Montañas del Tenorio es un negocio familiar de hospedaje y tours en Río Celeste, Costa Rica. Esta política explica cómo tratamos los datos personales que envías desde este sitio web.'] },
        { h: 'Qué datos recogemos', p: ['Cuando usas el formulario de reserva o de contacto recibimos lo que ingresas: nombre, correo, teléfono/WhatsApp, país, fechas de viaje, número de personas, preferencias de cabaña y tours y tu mensaje.'] },
        { h: 'Para qué los usamos', p: ['Solo para responder tu solicitud, confirmar disponibilidad, gestionar tu reserva y enviarte el enlace de adelanto cuando lo pidas. No vendemos tus datos ni los usamos para publicidad ajena a tu solicitud.'] },
        { h: 'Dónde se guardan', p: ['Las solicitudes se registran en una hoja privada de Google Sheets administrada por Montañas del Tenorio. El sitio está alojado en Vercel. Las conversaciones continúan por WhatsApp y los adelantos se procesan con PayPal, bajo sus propias políticas de privacidad.'] },
        { h: 'Analítica', p: ['Si la analítica del sitio está activa, medimos el uso de forma anónima (páginas visitadas y clics en botones como WhatsApp o Reservar) para mejorar el sitio. Tu preferencia de tema (claro/oscuro) se guarda solo en tu navegador.'] },
        { h: 'Tus derechos', p: ['Puedes pedirnos acceder, corregir o eliminar tus datos personales en cualquier momento, conforme a la Ley N.º 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales. ' + contactLine.es] },
        { h: 'Conservación', p: ['Conservamos tus datos solo el tiempo necesario para atender tu solicitud y reserva y cumplir obligaciones legales.'] },
      ],
    },
  },
  terms: {
    en: {
      updated: '2026-09-30',
      sections: [
        { h: 'Use of this website', p: ['This website presents the cabins and tours of Montañas del Tenorio and lets you request a reservation or contact us. By using it you agree to these terms.'] },
        { h: 'Information and prices', p: ['We work to keep the information accurate. Availability, rates and the final details of every stay or tour are confirmed with you in writing (by WhatsApp or email) before any payment.'] },
        { h: 'Reservation requests', p: ['Sending the form is a request, not a confirmed booking. A reservation is confirmed only after we confirm availability and you pay the ' + p + '% deposit, as explained in Reservations & Cancellations.'] },
        { h: 'Images', p: ['Some images on this site are provisional illustrations while our photo gallery is being updated; they are labelled as such.'] },
        { h: 'Third-party services', p: ['Links to WhatsApp, PayPal, Google Maps, Booking.com, Airbnb and social networks are governed by the terms of those services.'] },
        { h: 'Contact', p: [contactLine.en] },
      ],
    },
    es: {
      updated: '2026-09-30',
      sections: [
        { h: 'Uso del sitio', p: ['Este sitio presenta las cabañas y tours de Montañas del Tenorio y te permite solicitar una reserva o contactarnos. Al usarlo aceptas estos términos.'] },
        { h: 'Información y precios', p: ['Trabajamos para mantener la información actualizada. La disponibilidad, las tarifas y los detalles finales de cada estadía o tour se confirman contigo por escrito (WhatsApp o correo) antes de cualquier pago.'] },
        { h: 'Solicitudes de reserva', p: ['Enviar el formulario es una solicitud, no una reserva confirmada. La reserva se confirma solo después de que confirmemos la disponibilidad y pagues el adelanto del ' + p + '%, según Reservas y Cancelaciones.'] },
        { h: 'Imágenes', p: ['Algunas imágenes del sitio son ilustraciones provisionales mientras actualizamos nuestra galería; están identificadas como tales.'] },
        { h: 'Servicios de terceros', p: ['Los enlaces a WhatsApp, PayPal, Google Maps, Booking.com, Airbnb y redes sociales se rigen por los términos de esos servicios.'] },
        { h: 'Contacto', p: [contactLine.es] },
      ],
    },
  },
  policy: {
    en: {
      updated: '2026-09-30',
      sections: [
        { h: 'How to book', p: ['1. Send the reservation form with your dates, cabin and tours.', '2. Your request is registered and we contact you by WhatsApp to confirm availability and details.', `3. We send you a secure PayPal link for a ${p}% deposit. Your reservation is confirmed once the deposit is received.`] },
        { h: 'Availability', p: ['Availability is shared privately. We will always confirm your dates before asking for any payment.'] },
        { h: 'Balance', p: ['How and when to pay the remaining balance is confirmed with you in writing together with your reservation.'] },
        { h: 'Changes and cancellations', p: ['The conditions for changes, cancellations and refunds of the deposit are shared with you in writing before you pay it. If you have questions, write to us before booking.'] },
        { h: 'Tours and extras', p: ['Tours are not included with the cabins and are booked separately. Breakfast is available as a separate service.'] },
      ],
    },
    es: {
      updated: '2026-09-30',
      sections: [
        { h: 'Cómo reservar', p: ['1. Envía el formulario de reserva con tus fechas, cabaña y tours.', '2. Tu solicitud queda registrada y te contactamos por WhatsApp para confirmar disponibilidad y detalles.', `3. Te enviamos un enlace seguro de PayPal para un adelanto del ${p}%. La reserva queda confirmada al recibir el adelanto.`] },
        { h: 'Disponibilidad', p: ['La disponibilidad se comparte de forma privada. Siempre confirmamos tus fechas antes de pedir cualquier pago.'] },
        { h: 'Saldo', p: ['Cómo y cuándo pagar el saldo restante se confirma contigo por escrito junto con tu reserva.'] },
        { h: 'Cambios y cancelaciones', p: ['Las condiciones de cambios, cancelaciones y reembolso del adelanto se te comparten por escrito antes de pagarlo. Si tienes dudas, escríbenos antes de reservar.'] },
        { h: 'Tours y extras', p: ['Los tours no están incluidos con las cabañas y se reservan aparte. El desayuno está disponible como servicio aparte.'] },
      ],
    },
  },
};
