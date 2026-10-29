/**
 * Cart: cabins and tours the visitor wants to book.
 *
 * - The cart lives in localStorage, so it survives page changes.
 * - Prices and availability come from /api/booking/ (the server re-checks both on submit).
 * - [data-add-cabin] / [data-add-tour] links open the "add to cart" dialog; without JS they
 *   simply lead to the cart page, which opens the same dialog from ?cabin= / ?tour=.
 */
import { track } from './analytics';

type Slot = 'morning' | 'afternoon' | 'night';
const SLOTS: Slot[] = ['morning', 'afternoon', 'night'];
interface CabinItem { id: string; cabin: string; checkIn: string; checkOut: string; guests: number }
interface TourItem { id: string; tour: string; date: string; slot: Slot; adults: number; children: number }
interface Cart { cabins: CabinItem[]; tours: TourItem[] }
interface Range { from: string; to: string }
interface CabinData { base: number; included: number; extra: number; max: number; seasons: { from: string; to: string; base: number }[]; busy: Range[] }
interface TourData { adult: number; child: number; minimum: number; capacity: Record<Slot, number>; booked: Record<string, Record<Slot, number>> }
interface BookingData { ok: boolean; live: boolean; today: string; cabins: Record<string, CabinData>; tours: Record<string, TourData> }
interface Config {
  lang: 'en' | 'es';
  cartUrl: string;
  cabins: { slug: string; name: string; max: number }[];
  tours: { slug: string; name: string }[];
  t: Record<string, any>;
  form: { errors: Record<string, string>; summary: string };
}

const KEY = 'mt-cart-v1';
const cfgEl = document.querySelector<HTMLElement>('[data-cart-config]');
const cfg: Config | null = cfgEl ? JSON.parse(cfgEl.dataset.cartConfig || 'null') : null;
const t = cfg?.t ?? {};
const locale = cfg?.lang === 'es' ? 'es-CR' : 'en-US';
const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
const money = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(n);
const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const nights = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
/** "1 adult" / "3 adults" using the cart strings (key + 'One' / key + 'N'). */
const count = (n: number, key: 'guests' | 'adults' | 'children') => (n === 1 ? t[`${key}One`] : fmt(t[`${key}N`], { n }));
const uid = () => Math.random().toString(36).slice(2, 10);
const cabinName = (slug: string) => cfg?.cabins.find((c) => c.slug === slug)?.name ?? slug;
const tourName = (slug: string) => cfg?.tours.find((x) => x.slug === slug)?.name ?? slug;
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/* ---------- Storage + header badge ---------- */

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function readCart(): Cart {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && Array.isArray(v.cabins) && Array.isArray(v.tours)) {
      // Items whose date already passed are dropped instead of showing an error on return
      const today = localToday();
      const cabins = v.cabins.filter((i: CabinItem) => i.checkIn >= today);
      const tours = v.tours.filter((i: { date: string }) => i.date >= today);
      if (cabins.length !== v.cabins.length || tours.length !== v.tours.length) {
        const fresh = { ...v, cabins, tours };
        try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch { /* storage blocked */ }
        return fresh;
      }
      return v;
    }
  } catch { /* storage blocked */ }
  return { cabins: [], tours: [] };
}
function writeCart(c: Cart) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* storage blocked */ }
  updateBadge(c);
  document.dispatchEvent(new CustomEvent('cart:change'));
}
function updateBadge(c = readCart()) {
  const n = c.cabins.length + c.tours.length;
  document.querySelectorAll<HTMLElement>('[data-cart-link]').forEach((a) => {
    a.setAttribute('aria-label', fmt(a.dataset.label || '{n}', { n }));
    const badge = a.querySelector<HTMLElement>('[data-cart-count]');
    if (badge) { badge.textContent = String(n); badge.hidden = n === 0; }
  });
}

/* ---------- Prices + availability ---------- */

let dataPromise: Promise<BookingData> | null = null;
function loadData(fresh = false): Promise<BookingData> {
  if (!dataPromise || fresh) {
    dataPromise = fetch('/api/booking/', { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((d: BookingData) => { if (!d.ok) throw new Error('load'); return d; })
      .catch((e) => { dataPromise = null; throw e; });
  }
  return dataPromise;
}

const nightFree = (c: CabinData, d: string) => !c.busy.some((b) => d >= b.from && d < b.to);
const rangeFree = (c: CabinData, a: string, b: string) => { for (let d = a; d < b; d = addDays(d, 1)) if (!nightFree(c, d)) return false; return true; };
function cabinPrice(c: CabinData, a: string, b: string, guests: number) {
  let total = 0;
  for (let d = a; d < b; d = addDays(d, 1)) {
    const s = c.seasons.find((x) => d >= x.from && d <= x.to);
    total += (s ? s.base : c.base) + Math.max(0, guests - c.included) * c.extra;
  }
  return total;
}
const tourPrice = (x: TourData, adults: number, children: number) => Math.max(x.minimum, adults * x.adult + children * x.child);
/** Spots left on a tour slot, minus what is already in this cart (except the item being edited). */
function spotsLeft(x: TourData, tour: string, date: string, slot: Slot, exceptId?: string) {
  const inCart = readCart().tours.filter((i) => i.tour === tour && i.date === date && i.slot === slot && i.id !== exceptId)
    .reduce((n, i) => n + i.adults + i.children, 0);
  return x.capacity[slot] - (x.booked[date]?.[slot] ?? 0) - inCart;
}

/* ---------- Calendar ---------- */

interface CalState { start?: string; end?: string }
function calendar(
  host: HTMLElement,
  opts: { mode: 'range' | 'single'; min: string; free: (d: string) => boolean; rangeOk?: (a: string, b: string) => boolean; value: CalState; onChange: (v: CalState) => void },
) {
  const state: CalState = { ...opts.value };
  let month = (state.start ?? opts.min).slice(0, 7);
  const maxMonth = addDays(opts.min, 365).slice(0, 7);
  const choosingEnd = () => opts.mode === 'range' && !!state.start && !state.end;
  const selectable = (d: string) => {
    if (d < opts.min) return false;
    if (choosingEnd() && d > state.start! && opts.rangeOk?.(state.start!, d)) return true;
    return opts.free(d);
  };

  function draw() {
    host.replaceChildren();
    const head = el('div', 'cal__head');
    const prev = el('button', 'cal__nav', '‹'); prev.type = 'button'; prev.setAttribute('aria-label', t.prevMonth);
    const next = el('button', 'cal__nav', '›'); next.type = 'button'; next.setAttribute('aria-label', t.nextMonth);
    prev.disabled = month <= opts.min.slice(0, 7);
    next.disabled = month >= maxMonth;
    const first = `${month}-01`;
    const monthName = fmtDate(first, { month: 'long', year: 'numeric' });
    const label = el('p', 'cal__month', monthName.charAt(0).toUpperCase() + monthName.slice(1));
    label.setAttribute('aria-live', 'polite');
    prev.addEventListener('click', () => { month = addDays(first, -1).slice(0, 7); draw(); });
    next.addEventListener('click', () => { month = addDays(first, 32).slice(0, 7); draw(); });
    head.append(prev, label, next);

    const grid = el('div', 'cal__grid');
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', label.textContent || '');
    // Weekday names, Monday first
    for (let i = 0; i < 7; i++) {
      const wd = el('span', 'cal__wd', fmtDate(addDays('2024-01-01', i), { weekday: 'narrow' }));
      wd.setAttribute('aria-hidden', 'true');
      grid.append(wd);
    }
    const offset = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
    for (let i = 0; i < offset; i++) grid.append(el('span'));
    for (let d = first; d.slice(0, 7) === month; d = addDays(d, 1)) {
      const b = el('button', 'cal__day', String(Number(d.slice(8))));
      b.type = 'button';
      const ok = selectable(d);
      const inRange = state.start && state.end && d > state.start && d < state.end;
      b.disabled = !ok;
      b.classList.toggle('is-busy', d >= opts.min && !ok);
      b.classList.toggle('is-start', d === state.start);
      b.classList.toggle('is-end', d === state.end);
      b.classList.toggle('in-range', !!inRange);
      const picked = d === state.start || d === state.end;
      b.setAttribute('aria-pressed', String(picked));
      b.setAttribute('aria-label', `${fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}${!ok && d >= opts.min ? ` · ${t.unavailable}` : ''}`);
      b.addEventListener('click', () => pick(d));
      grid.append(b);
    }
    host.append(head, grid);
  }

  function pick(d: string) {
    if (opts.mode === 'single') { state.start = d; }
    else if (choosingEnd() && d > state.start! && opts.rangeOk?.(state.start!, d)) { state.end = d; }
    else { state.start = d; state.end = undefined; }
    draw();
    opts.onChange({ ...state });
    host.querySelector<HTMLButtonElement>('.cal__day[aria-pressed="true"]')?.focus();
  }

  draw();
}

/* ---------- "Add to cart" dialog ---------- */

const dialog = document.querySelector<HTMLDialogElement>('[data-cart-dialog]');
const $ = <T extends HTMLElement>(sel: string) => dialog?.querySelector<T>(sel) ?? null;

interface OpenOpts { kind: 'cabin' | 'tour'; slug?: string; pick?: boolean; edit?: CabinItem | TourItem }

async function openDialog(o: OpenOpts) {
  if (!dialog || !cfg) return;
  const form = $<HTMLFormElement>('form')!;
  const title = $('[data-cdlg-title]')!;
  const pickWrap = $('[data-cdlg-pick]')!;
  const pickLabel = $('[data-cdlg-pick-label]')!;
  const pickSel = $<HTMLSelectElement>('[data-cdlg-item]')!;
  const hint = $('[data-cdlg-hint]')!;
  const cal = $('[data-cdlg-cal]')!;
  const cabinBox = $('[data-cdlg-cabin]')!;
  const guests = $<HTMLInputElement>('[data-cdlg-guests]')!;
  const guestsHint = $('[data-cdlg-guests-hint]')!;
  const tourBox = $('[data-cdlg-tour]')!;
  const slotsBox = $('[data-cdlg-slots]')!;
  const adults = $<HTMLInputElement>('[data-cdlg-adults]')!;
  const children = $<HTMLInputElement>('[data-cdlg-children]')!;
  const price = $('[data-cdlg-price]')!;
  const error = $('[data-cdlg-error]')!;
  const submit = $<HTMLButtonElement>('[data-cdlg-submit]')!;

  const list = o.kind === 'cabin' ? cfg.cabins : cfg.tours;
  let slug = o.slug && list.some((x) => x.slug === o.slug) ? o.slug : list[0].slug;
  if (o.edit) slug = 'cabin' in o.edit ? o.edit.cabin : o.edit.tour;

  pickWrap.hidden = !o.pick;
  pickLabel.textContent = o.kind === 'cabin' ? t.chooseCabin : t.chooseTour;
  pickSel.replaceChildren(...list.map((x) => { const op = el('option', undefined, x.name); op.value = x.slug; return op; }));
  pickSel.value = slug;
  cabinBox.hidden = o.kind !== 'cabin';
  tourBox.hidden = o.kind !== 'tour';
  submit.textContent = o.edit ? t.update : t.confirmAdd;
  error.textContent = '';
  price.textContent = '';
  hint.textContent = t.loading;
  cal.replaceChildren();
  if (!dialog.open) dialog.showModal();

  let data: BookingData;
  try { data = await loadData(); } catch { hint.textContent = ''; error.textContent = t.errors.load; return; }

  let sel: CalState = {};
  let slot: Slot | undefined;

  const render = () => {
    title.textContent = o.kind === 'cabin' ? cabinName(slug) : tourName(slug);
    error.textContent = '';
    if (o.kind === 'cabin') {
      const c = data.cabins[slug];
      guests.max = String(c.max);
      if (Number(guests.value) > c.max) guests.value = String(c.max);
      guestsHint.textContent = fmt(t.maxGuests, { n: c.max });
      hint.textContent = !sel.start ? t.pickCheckIn : !sel.end ? t.pickCheckOut : `${fmtDate(sel.start)} → ${fmtDate(sel.end)} · ${nights(sel.start, sel.end) === 1 ? t.oneNight : fmt(t.nightsN, { n: nights(sel.start, sel.end) })}`;
      price.textContent = sel.start && sel.end ? `${t.total}: ${money(cabinPrice(c, sel.start, sel.end, Number(guests.value) || 1))}` : '';
    } else {
      const x = data.tours[slug];
      hint.textContent = sel.start ? fmtDate(sel.start, { weekday: 'long', day: 'numeric', month: 'long' }) : t.pickDate;
      slotsBox.replaceChildren();
      if (sel.start) {
        for (const s of SLOTS) {
          if (!x.capacity[s]) continue;
          const left = spotsLeft(x, slug, sel.start, s, o.edit?.id);
          const id = `cdlg-slot-${s}`;
          const wrap = el('label', 'cdlg__slot');
          wrap.htmlFor = id;
          const input = el('input');
          Object.assign(input, { type: 'radio', name: 'slot', id, value: s, disabled: left <= 0, checked: slot === s && left > 0 });
          input.addEventListener('change', () => { slot = s; render(); });
          wrap.append(input, el('span', 'cdlg__slot-name', t.slots[s]), el('span', 'cdlg__slot-left', left > 0 ? fmt(t.spotsLeft, { n: left }) : t.soldOut));
          slotsBox.append(wrap);
        }
        if (slot && spotsLeft(x, slug, sel.start, slot, o.edit?.id) <= 0) slot = undefined;
      }
      const a = Number(adults.value) || 0;
      const k = Number(children.value) || 0;
      price.textContent = sel.start && slot && a >= 1 ? `${t.total}: ${money(tourPrice(x, a, k))}` : '';
    }
  };

  const drawCal = () => {
    if (o.kind === 'cabin') {
      const c = data.cabins[slug];
      calendar(cal, {
        mode: 'range', min: data.today, value: sel,
        free: (d) => nightFree(c, d),
        rangeOk: (a, b) => nights(a, b) <= 60 && rangeFree(c, a, b),
        onChange: (v) => { sel = v; render(); },
      });
    } else {
      const x = data.tours[slug];
      calendar(cal, {
        mode: 'single', min: data.today, value: sel,
        free: (d) => SLOTS.some((s) => x.capacity[s] > 0 && spotsLeft(x, slug, d, s, o.edit?.id) > 0),
        onChange: (v) => { sel = v; render(); },
      });
    }
  };

  // Initial values (editing keeps the previous choice)
  if (o.edit && 'cabin' in o.edit) { sel = { start: o.edit.checkIn, end: o.edit.checkOut }; guests.value = String(o.edit.guests); }
  else if (o.edit && 'tour' in o.edit) { sel = { start: o.edit.date }; slot = o.edit.slot; adults.value = String(o.edit.adults); children.value = String(o.edit.children); }
  else { guests.value = '2'; adults.value = '2'; children.value = '0'; }

  pickSel.onchange = () => { slug = pickSel.value; sel = {}; slot = undefined; drawCal(); render(); };
  guests.oninput = adults.oninput = children.oninput = render;
  drawCal();
  render();

  form.onsubmit = (e) => {
    e.preventDefault();
    const cart = readCart();
    if (o.kind === 'cabin') {
      const c = data.cabins[slug];
      const g = Math.trunc(Number(guests.value));
      if (!sel.start || !sel.end) { error.textContent = t.errors.dates; return; }
      if (!(g >= 1 && g <= c.max)) { error.textContent = t.errors.guests; guests.focus(); return; }
      const item: CabinItem = { id: o.edit?.id ?? uid(), cabin: slug, checkIn: sel.start, checkOut: sel.end, guests: g };
      const clash = cart.cabins.some((i) => i.cabin === slug && i.id !== item.id && i.checkIn < item.checkOut && item.checkIn < i.checkOut);
      if (clash) { error.textContent = t.errors.unavailable; return; }
      cart.cabins = o.edit ? cart.cabins.map((i) => (i.id === item.id ? item : i)) : [...cart.cabins, item];
    } else {
      const x = data.tours[slug];
      const a = Math.trunc(Number(adults.value));
      const k = Math.max(0, Math.trunc(Number(children.value)) || 0);
      if (!sel.start) { error.textContent = t.errors.dates; return; }
      if (!slot) { error.textContent = t.errors.slot; return; }
      if (!(a >= 1)) { error.textContent = t.errors.guests; adults.focus(); return; }
      if (a + k > spotsLeft(x, slug, sel.start, slot, o.edit?.id)) { error.textContent = t.errors.full; return; }
      const item: TourItem = { id: o.edit?.id ?? uid(), tour: slug, date: sel.start, slot, adults: a, children: k };
      cart.tours = o.edit ? cart.tours.map((i) => (i.id === item.id ? item : i)) : [...cart.tours, item];
    }
    writeCart(cart);
    dialog.close();
    track('add_to_cart', { item: slug, kind: o.kind });
    if (!document.querySelector('[data-cart-page]')) showToast(fmt(t.added, { name: o.kind === 'cabin' ? cabinName(slug) : tourName(slug) }));
  };
}

dialog?.querySelectorAll('[data-cdlg-close]').forEach((b) => b.addEventListener('click', () => dialog.close()));
dialog?.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // click on backdrop

const toast = document.querySelector<HTMLElement>('[data-cart-toast]');
let toastTimer = 0;
function showToast(text: string) {
  if (!toast) return;
  toast.querySelector('[data-cart-toast-text]')!.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.hidden = true), 6000);
}
toast?.querySelector('[data-cart-toast-close]')?.addEventListener('click', () => (toast.hidden = true));

// Any "add" link on the site opens the dialog instead of navigating.
document.addEventListener('click', (e) => {
  const a = (e.target as Element | null)?.closest<HTMLElement>('[data-add-cabin], [data-add-tour]');
  if (!a || !dialog) return;
  e.preventDefault();
  const kind = a.dataset.addCabin !== undefined ? 'cabin' : 'tour';
  openDialog({ kind, slug: a.dataset.addCabin || a.dataset.addTour || undefined, pick: a.hasAttribute('data-add-pick') });
});

/* ---------- Cart page ---------- */

const page = document.querySelector<HTMLElement>('[data-cart-page]');
if (page && cfg) initCartPage(page, cfg);

function initCartPage(root: HTMLElement, c: Config) {
  const list = root.querySelector<HTMLElement>('[data-cart-items]')!;
  const empty = root.querySelector<HTMLElement>('[data-cart-empty]')!;
  const totalEl = root.querySelector<HTMLElement>('[data-cart-total]')!;
  const status = root.querySelector<HTMLElement>('[data-cart-status]')!;
  const form = root.querySelector<HTMLFormElement>('[data-cart-form]')!;
  const success = root.querySelector<HTMLElement>('[data-cart-success]')!;
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  let itemErrors: Record<string, string> = {};
  let data: BookingData | null = null;

  const render = () => {
    const cart = readCart();
    list.replaceChildren();
    const items = cart.cabins.length + cart.tours.length;
    empty.hidden = items > 0;
    form.hidden = items === 0;
    let total = 0;

    const row = (id: string, name: string, detail: string, amount: number | null, problem: string | undefined, onEdit: () => void, onRemove: () => void) => {
      const li = el('li', 'citem');
      const main = el('div', 'citem__main');
      main.append(el('p', 'citem__name', name), el('p', 'citem__detail', detail));
      if (problem) { const p = el('p', 'citem__error', problem); p.setAttribute('role', 'alert'); main.append(p); li.classList.add('has-error'); }
      const side = el('div', 'citem__side');
      side.append(el('p', 'citem__amount', amount === null ? '—' : money(amount)));
      const edit = el('button', 'citem__btn', t.edit); edit.type = 'button'; edit.setAttribute('aria-label', `${t.edit}: ${name}`);
      const del = el('button', 'citem__btn', '×'); del.type = 'button'; del.setAttribute('aria-label', fmt(t.remove, { name }));
      edit.addEventListener('click', onEdit);
      del.addEventListener('click', onRemove);
      const btns = el('div', 'citem__btns'); btns.append(edit, del);
      side.append(btns);
      li.dataset.item = id;
      li.append(main, side);
      list.append(li);
    };

    cart.cabins.forEach((i, idx) => {
      const d = data?.cabins[i.cabin];
      const n = nights(i.checkIn, i.checkOut);
      let problem = itemErrors[`cabin-${idx}`];
      if (!problem && d) {
        if (i.checkIn < data!.today) problem = t.errors.dates;
        else if (!rangeFree(d, i.checkIn, i.checkOut)) problem = t.errors.unavailable;
        else if (i.guests > d.max) problem = t.errors.guests;
      }
      const amount = d ? cabinPrice(d, i.checkIn, i.checkOut, i.guests) : null;
      if (amount) total += amount;
      row(`cabin-${idx}`, cabinName(i.cabin),
        `${fmtDate(i.checkIn)} → ${fmtDate(i.checkOut)} · ${n === 1 ? t.oneNight : fmt(t.nightsN, { n })} · ${count(i.guests, 'guests')}`,
        amount, problem,
        () => openDialog({ kind: 'cabin', edit: i }),
        () => { const cc = readCart(); cc.cabins = cc.cabins.filter((x) => x.id !== i.id); itemErrors = {}; writeCart(cc); });
    });
    cart.tours.forEach((i, idx) => {
      const d = data?.tours[i.tour];
      let problem = itemErrors[`tour-${idx}`];
      if (!problem && d) {
        if (i.date < data!.today) problem = t.errors.dates;
        else if (!d.capacity[i.slot]) problem = t.errors.slot;
        else if (spotsLeft(d, i.tour, i.date, i.slot, i.id) < i.adults + i.children) problem = t.errors.full;
      }
      const amount = d ? tourPrice(d, i.adults, i.children) : null;
      if (amount) total += amount;
      row(`tour-${idx}`, tourName(i.tour),
        `${fmtDate(i.date)} · ${t.slots[i.slot]} · ${count(i.adults, 'adults')}${i.children ? `, ${count(i.children, 'children')}` : ''}`,
        amount, problem,
        () => openDialog({ kind: 'tour', edit: i }),
        () => { const cc = readCart(); cc.tours = cc.tours.filter((x) => x.id !== i.id); itemErrors = {}; writeCart(cc); });
    });
    totalEl.textContent = money(total);
  };

  document.addEventListener('cart:change', render);
  render();
  loadData().then((d) => { data = d; render(); }).catch(() => { status.textContent = t.errors.load; });

  // Arriving from a card link without JS, or from the hero: open the dialog for that item.
  const q = new URLSearchParams(location.search);
  const qCabin = q.get('cabin');
  const qTour = q.get('tour');
  if (qCabin && c.cabins.some((x) => x.slug === qCabin)) openDialog({ kind: 'cabin', slug: qCabin });
  else if (qTour && c.tours.some((x) => x.slug === qTour)) openDialog({ kind: 'tour', slug: qTour });

  // Customer details + submit
  const setFieldError = (name: string, msg: string) => {
    const input = form.querySelector<HTMLInputElement>(`[name="${name}"]`);
    const err = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (input) msg ? input.setAttribute('aria-invalid', 'true') : input.removeAttribute('aria-invalid');
    if (err) err.textContent = msg;
  };
  form.addEventListener('input', (e) => { const n = (e.target as HTMLInputElement).name; if (n) setFieldError(n, ''); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const v = (k: string) => String(fd.get(k) ?? '').trim();
    const errs: Record<string, string> = {};
    if (v('name').length < 2) errs.name = c.form.errors.required;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) errs.email = v('email') ? c.form.errors.email : c.form.errors.required;
    const digits = v('phone').replace(/\D/g, '');
    if (!v('phone')) errs.phone = c.form.errors.required;
    else if (digits.length < 7 || digits.length > 15) errs.phone = c.form.errors.phone;
    if (!fd.get('consent')) errs.consent = c.form.errors.consent;
    ['name', 'email', 'phone', 'consent'].forEach((k) => setFieldError(k, errs[k] ?? ''));
    if (Object.keys(errs).length) {
      status.textContent = c.form.summary;
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }

    const cart = readCart();
    const customer = Object.fromEntries(['lang', 'name', 'email', 'phone', 'country', 'message', 'website'].map((k) => [k, v(k)]));
    Object.assign(customer, { consent: 'on' });
    submit.disabled = true;
    const label = submit.textContent;
    submit.textContent = t.sending;
    status.textContent = '';
    try {
      const res = await fetch('/api/cart/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ customer, cart: { cabins: cart.cabins, tours: cart.tours } }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.status === 409 && Array.isArray(out.items)) {
        itemErrors = Object.fromEntries(out.items.map((i: { item: string; code: string }) => [i.item, t.errors[i.code] ?? t.errors.unknown]));
        data = await loadData(true).catch(() => data);
        render();
        status.textContent = t.errors[out.items[0]?.code] ?? t.errors.unknown;
        list.querySelector<HTMLElement>('.has-error')?.scrollIntoView({ block: 'center' });
        return;
      }
      if (res.status === 422 && out.fields) {
        for (const [k, code] of Object.entries<string>(out.fields)) setFieldError(k, c.form.errors[code] ?? c.form.errors.required);
        status.textContent = c.form.summary;
        return;
      }
      if (!res.ok || !out.ok) throw new Error(out.error || String(res.status));

      track('reservation_submit', { reference: out.reference, total: out.total });
      writeCart({ cabins: [], tours: [] });
      root.querySelector<HTMLElement>('[data-cart-main]')!.hidden = true;
      const wa = success.querySelector<HTMLAnchorElement>('[data-cart-wa]')!;
      const text = success.querySelector<HTMLElement>('[data-cart-success-text]')!;
      text.textContent = fmt(out.whatsappUrl ? t.successText : t.successNoWa, { id: out.reference });
      if (out.whatsappUrl) { wa.href = out.whatsappUrl; wa.hidden = false; }
      success.hidden = false;
      success.focus();
    } catch {
      status.textContent = c.form.errors.server;
    } finally {
      submit.disabled = false;
      submit.textContent = label;
    }
  });
}

updateBadge();
window.addEventListener('storage', (e) => { if (e.key === KEY) { updateBadge(); document.dispatchEvent(new CustomEvent('cart:change')); } });
