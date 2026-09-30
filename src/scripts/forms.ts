/**
 * Progressive enhancement for [data-inquiry-form]:
 * client validation, accessible errors, JSON submit, success + WhatsApp hand-off.
 * Without JS the form still posts to /api/inquiry (server validates again).
 */
import { track } from './analytics';

type Msgs = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function today(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function setError(form: HTMLFormElement, name: string, msg: string) {
  const el = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
  const inputs = form.querySelectorAll<HTMLInputElement>(`[name="${name}"]`);
  inputs.forEach((i) => (msg ? i.setAttribute('aria-invalid', 'true') : i.removeAttribute('aria-invalid')));
  if (el) el.textContent = msg;
}

function validate(form: HTMLFormElement, msgs: Msgs): Record<string, string> {
  const fd = new FormData(form);
  const v = (k: string) => String(fd.get(k) ?? '').trim();
  const errs: Record<string, string> = {};
  const isRes = v('type') !== 'contact';
  if (v('name').length < 2) errs.name = msgs.required;
  if (!v('email')) errs.email = msgs.required;
  else if (!EMAIL_RE.test(v('email'))) errs.email = msgs.email;
  if (!fd.get('consent')) errs.consent = msgs.consent;
  if (!isRes) {
    if (v('message').length < 2) errs.message = msgs.required;
    return errs;
  }
  const digits = v('phone').replace(/\D/g, '');
  if (!v('phone')) errs.phone = msgs.required;
  else if (digits.length < 7 || digits.length > 15) errs.phone = msgs.phone;
  if (!v('checkIn')) errs.checkIn = msgs.required;
  else if (v('checkIn') < today()) errs.checkIn = msgs.past;
  if (v('cabin') !== 'none') {
    if (!v('checkOut')) errs.checkOut = msgs.required;
    else if (v('checkIn') && v('checkOut') <= v('checkIn')) errs.checkOut = msgs.dates;
  }
  if ((parseInt(v('adults'), 10) || 0) < 1) errs.adults = msgs.guests;
  return errs;
}

function showErrors(form: HTMLFormElement, errs: Record<string, string>, summary: HTMLElement | null, summaryText: string) {
  form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((el) => setError(form, el.dataset.errorFor!, ''));
  const names = Object.keys(errs);
  names.forEach((n) => setError(form, n, errs[n]));
  if (summary) summary.textContent = names.length ? summaryText : '';
  if (names.length) form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}

export function initInquiryForms(): void {
  document.querySelectorAll<HTMLFormElement>('[data-inquiry-form]').forEach((form) => {
    const msgs: Msgs = JSON.parse(form.dataset.msgs || '{}');
    const summary = form.querySelector<HTMLElement>('[data-form-status]');
    const submit = form.querySelector<HTMLButtonElement>('[type="submit"]');
    const success = document.getElementById(form.dataset.success || '');
    const kind = form.querySelector<HTMLInputElement>('[name="type"]')?.value === 'contact' ? 'contact' : 'reservation';

    // Prefill from query string (?cabin=rustic&tour=tubing)
    const params = new URLSearchParams(location.search);
    const cabin = params.get('cabin');
    const cabinSel = form.querySelector<HTMLSelectElement>('[name="cabin"]');
    if (cabin && cabinSel && [...cabinSel.options].some((o) => o.value === cabin)) cabinSel.value = cabin;
    params.getAll('tour').forEach((tour) => {
      const cb = form.querySelector<HTMLInputElement>(`[name="tours"][value="${CSS.escape(tour)}"]`);
      if (cb) cb.checked = true;
    });
    if (params.get('error') && summary) summary.textContent = msgs.server;

    // Date constraints
    const checkIn = form.querySelector<HTMLInputElement>('[name="checkIn"]');
    const checkOut = form.querySelector<HTMLInputElement>('[name="checkOut"]');
    if (checkIn) checkIn.min = today();
    const syncDates = () => {
      if (!checkIn || !checkOut) return;
      checkOut.min = checkIn.value ? addDays(checkIn.value, 1) : addDays(today(), 1);
      if (checkIn.value && checkOut.value && checkOut.value <= checkIn.value) checkOut.value = addDays(checkIn.value, 1);
    };
    checkIn?.addEventListener('change', syncDates);
    syncDates();
    const syncCabin = () => {
      if (!checkOut || !cabinSel) return;
      const none = cabinSel.value === 'none';
      checkOut.required = !none;
      checkOut.closest('.field')?.classList.toggle('is-optional', none);
      checkOut.closest('.field')?.toggleAttribute('hidden', none);
    };
    cabinSel?.addEventListener('change', syncCabin);
    syncCabin();

    // Clear an error as soon as the field is corrected
    form.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.name && t.getAttribute('aria-invalid') === 'true') setError(form, t.name, '');
    });

    let started = false;
    form.addEventListener('focusin', () => {
      if (!started) { started = true; track(`${kind}_form_start`); }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errs = validate(form, msgs);
      showErrors(form, errs, summary, msgs.summary);
      if (Object.keys(errs).length) return;

      const fd = new FormData(form);
      const body: Record<string, unknown> = {};
      for (const key of new Set(fd.keys())) {
        const all = fd.getAll(key).map(String);
        body[key] = key === 'tours' ? all : all[0];
      }

      if (submit) { submit.disabled = true; submit.dataset.label = submit.textContent || ''; submit.textContent = msgs.sending; }
      form.setAttribute('aria-busy', 'true');
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 422 && data.fields) {
          const mapped: Record<string, string> = {};
          for (const [k, code] of Object.entries<string>(data.fields)) mapped[k] = msgs[code] || msgs.required;
          showErrors(form, mapped, summary, msgs.summary);
          return;
        }
        if (!res.ok || !data.ok) throw new Error(data.error || String(res.status));

        track(`${kind}_submit`, { reference: data.reference, stored: data.stored });
        if (success) {
          const ref = success.querySelector('[data-ref]');
          if (ref) ref.textContent = ref.textContent!.replace('{id}', data.reference);
          const wa = success.querySelector<HTMLAnchorElement>('[data-wa]');
          const noWa = success.querySelector<HTMLElement>('[data-no-wa]');
          if (wa && data.whatsappUrl) { wa.href = data.whatsappUrl; wa.hidden = false; }
          else if (noWa) { noWa.hidden = false; noWa.textContent = noWa.textContent!.replace('{id}', data.reference); ref?.setAttribute('hidden', ''); }
          form.hidden = true;
          success.hidden = false;
          success.focus();
        }
      } catch {
        if (summary) summary.textContent = msgs.server;
        summary?.focus();
      } finally {
        form.removeAttribute('aria-busy');
        if (submit) { submit.disabled = false; submit.textContent = submit.dataset.label || ''; }
      }
    });
  });
}
