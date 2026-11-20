import './style.css';
import { App as CapApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { cans, compute, defaultSettings, geometry, MATERIALS, type Extra, type Material, type Opening, type Room, type RoomResult } from './calc';
import { applyTheme, getLangPref, getThemePref, lang, setLangPref, setThemePref, t, type LangPref, type Theme } from './i18n';
import { scanRoom, scanSupported } from './scan';
import { loadRooms, newRoom, saveRooms, uid } from './store';
import { confirmBox, fmtDate, h, icon, modal, native, promptBox, shareText, sheet, toast } from './ui';
import * as U from './units';
import { reviewMoment } from './review';

const app = document.getElementById('app')!;
let rooms: Room[] = [];
let canScan = false;
type Route = { page: 'home' } | { page: 'room'; id: string } | { page: 'list' };
let route: Route = { page: 'home' };

const MAT: Record<Material, { title: string; icon: string }> = {
  flooring: { title: 'Flooring', icon: 'floor' },
  tile: { title: 'Tile', icon: 'tile' },
  paint: { title: 'Paint', icon: 'paint' },
  wallpaper: { title: 'Wallpaper', icon: 'wallpaper' },
  baseboard: { title: 'Baseboard', icon: 'baseboard' },
};

function go(r: Route) {
  route = r;
  render();
  window.scrollTo(0, 0);
}

function render() {
  app.replaceChildren();
  if (route.page === 'room') {
    const id = route.id;
    const r = rooms.find((x) => x.id === id);
    if (r) { app.append(roomPage(r)); return; }
    route = { page: 'home' };
  }
  app.append(route.page === 'list' ? listPage() : homePage());
}

let saveTimer = 0;
function touch(r: Room) {
  r.updated = Date.now();
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void saveRooms(rooms), 400);
}
const saveNow = () => { clearTimeout(saveTimer); return saveRooms(rooms); };

// ---------------- home ----------------
function matSummary(r: Room) {
  return MATERIALS.filter((m) => r.m[m].on).map((m) => t(MAT[m].title)).join(', ');
}

async function startScan() {
  try {
    const s = await scanRoom();
    if (!s) return;
    const r = newRoom(`${t('Room')} ${rooms.length + 1}`);
    r.scan = { floorArea: s.floorArea, perimeter: s.perimeter, height: s.height, walls: s.walls };
    r.height = s.height;
    r.openings = [
      ...s.doors.map((d): Opening => ({ id: uid(), kind: 'door', w: d.w, h: d.h, count: 1 })),
      ...s.windows.map((w): Opening => ({ id: uid(), kind: 'window', w: w.w, h: w.h, count: 1 })),
    ];
    rooms.unshift(r);
    await saveNow();
    go({ page: 'room', id: r.id });
    toast(t('Room scanned'));
  } catch (e) {
    toast(`${t('Scan failed')}: ${(e as Error).message}`, 'err');
  }
}

async function addManual() {
  const r = newRoom(`${t('Room')} ${rooms.length + 1}`);
  rooms.unshift(r);
  await saveNow();
  go({ page: 'room', id: r.id });
  requestAnimationFrame(() => (document.querySelector('.size input') as HTMLInputElement | null)?.focus());
}

function homePage() {
  const totalCost = rooms.reduce((s, r) => s + compute(r).cost, 0);
  return h('div', { class: 'page home' },
    h('header', { class: 'top' },
      h('div', { class: 'brand' }, h('span', { class: 'logo' }, icon('home')), 'Roomcalc'),
      h('button', { class: 'icon-btn', 'aria-label': t('Settings'), onclick: openSettings }, icon('gear'))),
    h('section', { class: 'hero' },
      h('h1', {}, t('How much do I need?')),
      h('p', {}, t('Measure a room once. Get flooring, tile, paint, wallpaper and baseboard amounts in seconds.')),
      h('div', { class: 'hero-actions' },
        canScan && h('button', { class: 'btn primary big', onclick: () => void startScan() }, icon('scan'), t('Scan a room')),
        h('button', { class: `btn ${canScan ? 'soft' : 'primary'} big`, onclick: () => void addManual() }, icon('ruler'), t('Enter size'))),
      !canScan && h('p', { class: 'hint' }, t('Room scanning works on iPhone Pro models with LiDAR. Typing the size works on every iPhone.'))),
    rooms.length > 0 && h('button', { class: 'list-card', onclick: () => go({ page: 'list' }) },
      h('span', { class: 'list-ico' }, icon('list')),
      h('span', { class: 'grow' },
        h('b', {}, t('Shopping list')),
        h('small', {}, `${rooms.length} ${t(rooms.length === 1 ? 'room' : 'rooms')}${totalCost > 0 ? ` · ${U.money(totalCost)}` : ''}`)),
      icon('chevron')),
    h('h2', { class: 'section' }, t('Rooms')),
    rooms.length
      ? h('div', { class: 'rooms' }, rooms.map((r) => {
          const res = compute(r);
          return h('button', { class: 'room-row', onclick: () => go({ page: 'room', id: r.id }) },
            h('span', { class: `room-ico ${r.scan ? 'scanned' : ''}` }, icon(r.scan ? 'scan' : 'ruler')),
            h('span', { class: 'grow' },
              h('b', {}, r.name),
              h('small', {}, res.g.floor > 0 ? `${U.area(res.g.floor)} · ${matSummary(r) || t('No materials')}` : t('Size not entered yet'))),
            res.cost > 0 && h('span', { class: 'room-cost' }, U.money(res.cost)),
            icon('chevron'));
        }))
      : h('div', { class: 'empty' },
          h('div', { class: 'empty-art' }, icon('floor')),
          h('b', {}, t('No rooms yet')),
          h('p', {}, t('Add your first room to see what to buy.'))));
}

// ---------------- room ----------------
type Parse = (s: string) => number;

/** A labelled number input. Calls set() with a valid value on every keystroke, then refresh(). */
function numField(label: string, value: string, unit: string, parse: Parse, set: (v: number) => void, refresh: () => void, cls = '') {
  const input = h('input', { type: 'text', inputmode: 'decimal', value, placeholder: '0', autocomplete: 'off', enterkeyhint: 'done', 'aria-label': label }) as HTMLInputElement;
  input.addEventListener('input', () => {
    const v = input.value.trim() === '' ? 0 : parse(input.value);
    input.classList.toggle('bad', Number.isNaN(v));
    if (!Number.isNaN(v)) { set(v); refresh(); }
  });
  input.addEventListener('focus', () => setTimeout(() => input.select(), 0));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  return h('label', { class: `field ${cls}` }, h('span', { class: 'f-label' }, label), h('span', { class: 'f-box' }, input, unit && h('span', { class: 'f-unit' }, unit)));
}

/** Room length: one field in metres, or feet + inches. */
function lenInput(label: string, m: number, set: (v: number) => void, refresh: () => void) {
  if (!U.imperial()) return numField(label, m ? U.num(m, 2) : '', 'm', U.parseLen, set, refresh);
  const totalIn = Math.round(m / 0.0254);
  let ft = Math.floor(totalIn / 12), inch = totalIn - ft * 12;
  const upd = () => { set(ft * 0.3048 + inch * 0.0254); refresh(); };
  const mk = (v: number, unit: string, on: (x: number) => void) => {
    const input = h('input', { type: 'text', inputmode: 'decimal', value: v ? String(v) : '', placeholder: '0', 'aria-label': `${label} (${unit})` }) as HTMLInputElement;
    input.addEventListener('input', () => { const x = input.value.trim() === '' ? 0 : U.parsePlain(input.value); input.classList.toggle('bad', Number.isNaN(x)); if (!Number.isNaN(x)) { on(x); upd(); } });
    input.addEventListener('focus', () => setTimeout(() => input.select(), 0));
    return h('span', { class: 'f-box' }, input, h('span', { class: 'f-unit' }, unit));
  };
  return h('label', { class: 'field' }, h('span', { class: 'f-label' }, label),
    h('span', { class: 'f-pair' }, mk(ft, 'ft', (x) => (ft = x)), mk(inch, 'in', (x) => (inch = x))));
}

function stepper(value: number, on: (v: number) => void, min = 1) {
  const out = h('span', { class: 'step-v' }, String(value));
  const set = (v: number) => { value = Math.max(min, v); out.textContent = String(value); on(value); };
  return h('span', { class: 'stepper' },
    h('button', { 'aria-label': '−', onclick: (e: Event) => { e.preventDefault(); set(value - 1); } }, '−'), out,
    h('button', { 'aria-label': '+', onclick: (e: Event) => { e.preventDefault(); set(value + 1); } }, '+'));
}

function roomText(r: Room, res = compute(r)): string {
  const lines = [`${r.name} — ${U.area(res.g.floor)}`];
  for (const l of materialLines(r, res)) lines.push(`• ${l}`);
  if (res.cost > 0) lines.push(`${t('Estimated cost')}: ${U.money(res.cost)}`);
  return lines.join('\n');
}

/** One-line summary per enabled material, used for sharing. */
function materialLines(r: Room, res: RoomResult): string[] {
  const out: string[] = [];
  if (res.flooring) out.push(`${t('Flooring')}: ${U.area(res.flooring.area)}${res.flooring.boxes ? ` (${res.flooring.boxes} ${t('boxes')})` : ''}`);
  if (res.tile) out.push(`${t('Tile')}: ${res.tile.tiles} ${t('tiles')} ${U.small(r.m.tile.tw)} × ${U.small(r.m.tile.th)}${res.tile.boxes ? ` (${res.tile.boxes} ${t('boxes')})` : ''}, ${t('grout')} ${U.num(res.tile.groutKg, 1)} kg`);
  if (res.paint) out.push(`${t('Paint')}: ${U.volume(res.paint.litres)} — ${canText(res.paint.litres)}`);
  if (res.wallpaper) out.push(`${t('Wallpaper')}: ${res.wallpaper.rolls} ${t('rolls')}`);
  if (res.baseboard) out.push(`${t('Baseboard')}: ${U.len(res.baseboard.length)} (${res.baseboard.pieces} × ${U.len(r.m.baseboard.piece)})`);
  return out;
}

const canText = (litres: number) => cans(litres, U.canSizes()).map((c) => `${c.n} × ${U.canLabel(c.size)}`).join(' + ');

function roomPage(r: Room) {
  const stats = h('div', { class: 'stats' });
  const results: Partial<Record<Material, HTMLElement>> = {};
  const totalEl = h('div', { class: 'total' });

  const refresh = () => {
    const res = compute(r);
    touch(r);
    stats.replaceChildren(
      stat(t('Floor'), res.g.floor > 0 ? U.area(res.g.floor) : '—'),
      stat(t('Walls'), res.g.wallNet > 0 ? U.area(res.g.wallNet) : '—'),
      stat(t('Perimeter'), res.g.perimeter > 0 ? U.len(res.g.perimeter) : '—'));
    for (const m of MATERIALS) { const el = results[m]; if (el) el.replaceChildren(...materialResult(m, r, res)); }
    totalEl.replaceChildren(...(res.cost > 0 ? [h('span', {}, t('Estimated cost')), h('b', {}, U.money(res.cost))] : []));
    totalEl.hidden = !(res.cost > 0);
  };

  const sizeEl = h('section', { class: 'card size' });
  const drawSize = () => {
    if (r.scan) {
      sizeEl.replaceChildren(
        h('div', { class: 'card-head' }, h('span', { class: 'chip-ico scanned' }, icon('scan')), h('b', {}, t('Scanned with LiDAR'))),
        h('div', { class: 'kv' },
          h('span', {}, t('Floor area')), h('b', {}, U.area(r.scan.floorArea)),
          h('span', {}, t('Wall length')), h('b', {}, U.len(r.scan.perimeter)),
          h('span', {}, t('Walls found')), h('b', {}, String(r.scan.walls.length))),
        h('div', { class: 'grid2' }, lenInput(t('Ceiling height'), r.height, (v) => (r.height = v), refresh)),
        h('button', { class: 'link', onclick: async () => {
          if (!(await confirmBox(t('Type the size instead?'), t('The scan is replaced by length and width you type. Doors and windows are kept.'), t('Type size')))) return;
          const s = r.scan!;
          // Start from a rectangle with the scanned area and wall length.
          const half = s.perimeter / 2, disc = Math.max(0, half * half - 4 * s.floorArea);
          r.length = Math.round(((half + Math.sqrt(disc)) / 2) * 100) / 100;
          r.width = Math.round((half - r.length) * 100) / 100;
          r.scan = undefined;
          drawSize(); refresh();
        } }, t('Type the size instead')));
      return;
    }
    const extras = h('div', { class: 'extras' });
    const drawExtras = () => {
      extras.replaceChildren(...r.extras.map((e) => h('div', { class: 'extra' },
        h('div', { class: 'extra-head' },
          h('b', {}, e.kind === 'add' ? t('Extra part (L-shape, alcove)') : t('Not covered (cabinets, island, tub)')),
          h('button', { class: 'icon-btn small', 'aria-label': t('Delete'), onclick: () => { r.extras = r.extras.filter((x) => x !== e); drawExtras(); refresh(); } }, icon('trash'))),
        h('div', { class: 'grid2' },
          lenInput(t('Width'), e.w, (v) => (e.w = v), refresh),
          lenInput(t('Depth'), e.d, (v) => (e.d = v), refresh)))));
    };
    drawExtras();
    const addExtra = (kind: Extra['kind']) => { r.extras.push({ id: uid(), kind, w: 0, d: 0 }); drawExtras(); refresh(); (extras.lastElementChild?.querySelector('input') as HTMLInputElement | null)?.focus(); };
    sizeEl.replaceChildren(...[
      h('div', { class: 'card-head' }, h('span', { class: 'chip-ico' }, icon('ruler')), h('b', {}, t('Room size'))),
      h('div', { class: 'grid2' },
        lenInput(t('Length'), r.length, (v) => (r.length = v), refresh),
        lenInput(t('Width'), r.width, (v) => (r.width = v), refresh)),
      h('div', { class: 'grid2' }, lenInput(t('Ceiling height'), r.height, (v) => (r.height = v), refresh)),
      extras,
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn soft small', onclick: () => addExtra('add') }, icon('plus'), t('Extra part')),
        h('button', { class: 'btn soft small', onclick: () => addExtra('sub') }, icon('plus'), t('Not covered'))),
      canScan && h('button', { class: 'link', onclick: async () => {
        const s = await scanRoom().catch((e) => { toast((e as Error).message, 'err'); return null; });
        if (!s) return;
        r.scan = { floorArea: s.floorArea, perimeter: s.perimeter, height: s.height, walls: s.walls };
        r.height = s.height;
        if (!r.openings.length) r.openings = [...s.doors.map((d): Opening => ({ id: uid(), kind: 'door', w: d.w, h: d.h, count: 1 })), ...s.windows.map((w): Opening => ({ id: uid(), kind: 'window', w: w.w, h: w.h, count: 1 }))];
        render();
      } }, icon('scan'), t('Scan this room instead'))].filter((x): x is Exclude<typeof x, false> => !!x));
  };
  drawSize();

  const openEl = h('section', { class: 'card openings' });
  const drawOpenings = () => {
    openEl.replaceChildren(
      h('div', { class: 'card-head' }, h('span', { class: 'chip-ico' }, icon('door')), h('b', {}, t('Doors and windows')), h('small', {}, t('taken off the walls'))),
      ...r.openings.map((o) => h('div', { class: 'opening' },
        h('span', { class: 'o-ico' }, icon(o.kind)),
        numField(t('Width'), U.smallField(o.w), U.smallUnit(), U.parseSmall, (v) => (o.w = v), refresh, 'compact'),
        numField(t('Height'), U.smallField(o.h), U.smallUnit(), U.parseSmall, (v) => (o.h = v), refresh, 'compact'),
        stepper(o.count, (v) => { o.count = v; refresh(); }),
        h('button', { class: 'icon-btn small', 'aria-label': t('Delete'), onclick: () => { r.openings = r.openings.filter((x) => x !== o); drawOpenings(); refresh(); } }, icon('trash')))),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn soft small', onclick: () => { r.openings.push({ id: uid(), kind: 'door', w: U.imperial() ? 32 * 0.0254 : 0.8, h: U.imperial() ? 80 * 0.0254 : 2.0, count: 1 }); drawOpenings(); refresh(); } }, icon('door'), t('Door')),
        h('button', { class: 'btn soft small', onclick: () => { r.openings.push({ id: uid(), kind: 'window', w: U.imperial() ? 36 * 0.0254 : 1.2, h: U.imperial() ? 48 * 0.0254 : 1.2, count: 1 }); drawOpenings(); refresh(); } }, icon('window'), t('Window'))));
  };
  drawOpenings();

  const matsEl = h('div', { class: 'mats' });
  const drawMats = () => {
    matsEl.replaceChildren(
      h('div', { class: 'toggles' }, MATERIALS.map((m) => h('button', {
        class: `toggle m-${m} ${r.m[m].on ? 'on' : ''}`, 'aria-pressed': String(r.m[m].on),
        onclick: () => { r.m[m].on = !r.m[m].on; drawMats(); refresh(); },
      }, icon(r.m[m].on ? 'check' : MAT[m].icon), t(MAT[m].title)))),
      ...MATERIALS.filter((m) => r.m[m].on).map((m) => {
        const res = h('div', { class: 'm-res' });
        results[m] = res;
        return h('section', { class: `card mat m-${m}` },
          h('div', { class: 'card-head' }, h('span', { class: 'chip-ico' }, icon(MAT[m].icon)), h('b', {}, t(MAT[m].title))),
          res,
          h('details', { class: 'm-set' }, h('summary', {}, t('Sizes and prices')), h('div', { class: 'grid2' }, ...materialFields(m, r, refresh))));
      }));
    for (const m of MATERIALS) if (!r.m[m].on) delete results[m];
  };
  drawMats();

  const page = h('div', { class: 'page room' },
    h('header', { class: 'top' },
      h('button', { class: 'back', onclick: () => { void saveNow(); go({ page: 'home' }); } }, icon('back'), t('Rooms')),
      h('div', { class: 'top-actions' },
        h('button', { class: 'icon-btn', 'aria-label': t('Share'), onclick: () => void shareText(r.name, roomText(r)) }, icon('share')),
        h('button', { class: 'icon-btn', 'aria-label': t('More'), onclick: () => sheet(r.name, [
          { label: t('Rename'), run: async () => { const n = await promptBox(t('Rename room'), t('Name'), r.name, t('Rename')); if (n) { r.name = n; touch(r); render(); } } },
          { label: t('Duplicate'), run: async () => { const c: Room = JSON.parse(JSON.stringify(r)); c.id = uid(); c.name = `${r.name} 2`; c.updated = Date.now(); rooms.unshift(c); await saveNow(); go({ page: 'room', id: c.id }); } },
          { label: t('Delete room'), danger: true, run: async () => {
            if (!(await confirmBox(`${t('Delete')} “${r.name}”?`, t('This room and its measurements are removed.'), t('Delete'), true))) return;
            rooms = rooms.filter((x) => x !== r); await saveNow(); go({ page: 'home' });
          } },
        ]) }, icon('more')))),
    h('button', { class: 'room-title', onclick: async () => { const n = await promptBox(t('Rename room'), t('Name'), r.name, t('Rename')); if (n) { r.name = n; touch(r); render(); } } }, r.name),
    h('div', { class: 'muted small' }, `${t('Edited')} ${fmtDate(r.updated)}`),
    stats,
    sizeEl,
    openEl,
    h('h2', { class: 'section' }, t('What are you buying?')),
    matsEl,
    totalEl,
    h('p', { class: 'fine' }, t('Amounts include the waste allowance you set. Check sizes and coverage on the product label before you buy.')));
  refresh();
  r.updated = r.updated || Date.now();
  return page;
}

const stat = (label: string, value: string) => h('div', { class: 'stat' }, h('small', {}, label), h('b', {}, value));
const big = (value: string, label: string) => h('div', { class: 'big-n' }, h('b', {}, value), h('span', {}, label));
const line = (label: string, value: string) => h('div', { class: 'm-line' }, h('span', {}, label), h('b', {}, value));

function materialResult(m: Material, r: Room, res: RoomResult): HTMLElement[] {
  if (res.g.floor <= 0 && m !== 'paint') return [h('p', { class: 'muted small' }, t('Enter the room size first.'))];
  switch (m) {
    case 'flooring': {
      const f = res.flooring!;
      return [h('div', { class: 'bigs' }, big(U.area(f.area), t('to buy')), f.boxes > 0 && big(String(f.boxes), t('boxes'))),
        line(t('Floor area'), U.area(res.g.floor)), line(t('Waste allowance'), `${r.m.flooring.waste}%`),
        f.cost > 0 && line(t('Cost'), U.money(f.cost))].filter(Boolean) as HTMLElement[];
    }
    case 'tile': {
      const x = res.tile!;
      return [h('div', { class: 'bigs' }, big(U.int(x.tiles), t('tiles')), x.boxes > 0 && big(String(x.boxes), t('boxes'))),
        line(t('Tile size'), `${U.small(r.m.tile.tw)} × ${U.small(r.m.tile.th)}`), line(t('Area with waste'), U.area(x.area)),
        line(t('Grout'), `${U.num(x.groutKg, 1)} kg`), x.cost > 0 && line(t('Cost'), U.money(x.cost))].filter(Boolean) as HTMLElement[];
    }
    case 'paint': {
      const p = res.paint!;
      if (p.area <= 0) return [h('p', { class: 'muted small' }, t('Enter the room size first.'))];
      return [h('div', { class: 'bigs' }, big(U.volume(p.litres), t('of paint'))),
        line(t('Cans'), canText(p.litres)),
        line(t('Area to paint'), U.area(p.area)), line(t('Coats'), String(r.m.paint.coats)),
        p.cost > 0 && line(t('Cost'), U.money(p.cost))].filter(Boolean) as HTMLElement[];
    }
    case 'wallpaper': {
      const w = res.wallpaper!;
      if (res.g.height <= 0) return [h('p', { class: 'muted small' }, t('Enter the ceiling height first.'))];
      return [h('div', { class: 'bigs' }, big(String(w.rolls), t('rolls'))),
        line(t('Strips'), `${w.strips} × ${U.len(w.stripLength)}`), line(t('Strips per roll'), String(w.perRoll)),
        w.cost > 0 && line(t('Cost'), U.money(w.cost))].filter(Boolean) as HTMLElement[];
    }
    case 'baseboard': {
      const b = res.baseboard!;
      return [h('div', { class: 'bigs' }, big(U.len(b.length), t('total')), big(String(b.pieces), `× ${U.len(r.m.baseboard.piece)}`)),
        line(t('Door openings left out'), U.len(res.g.doorWidth)), b.cost > 0 && line(t('Cost'), U.money(b.cost))].filter(Boolean) as HTMLElement[];
    }
  }
}

function materialFields(m: Material, r: Room, refresh: () => void): HTMLElement[] {
  const pct = (v: number) => U.num(v, 1);
  const cur = U.money(0).replace(/[\d\s.,]/g, '') || '';
  switch (m) {
    case 'flooring': {
      const s = r.m.flooring;
      return [
        numField(t('Box covers'), U.areaField(s.box), U.areaUnit(), U.parseArea, (v) => (s.box = v), refresh),
        numField(t('Waste'), pct(s.waste), '%', U.parsePlain, (v) => (s.waste = v), refresh),
        numField(`${t('Price per')} ${U.areaUnit()}`, s.price ? U.num(U.pricePerArea(s.price), 2) : '', cur, U.parsePricePerArea, (v) => (s.price = v), refresh)];
    }
    case 'tile': {
      const s = r.m.tile;
      return [
        numField(t('Tile width'), U.smallField(s.tw), U.smallUnit(), U.parseSmall, (v) => (s.tw = v), refresh),
        numField(t('Tile length'), U.smallField(s.th), U.smallUnit(), U.parseSmall, (v) => (s.th = v), refresh),
        numField(t('Joint'), U.mmField(s.joint), U.imperial() ? 'in' : 'mm', U.parseMm, (v) => (s.joint = v), refresh),
        numField(t('Tile thickness'), U.mmField(s.depth), U.imperial() ? 'in' : 'mm', U.parseMm, (v) => (s.depth = v), refresh),
        numField(t('Box covers'), U.areaField(s.box), U.areaUnit(), U.parseArea, (v) => (s.box = v), refresh),
        numField(t('Waste'), pct(s.waste), '%', U.parsePlain, (v) => (s.waste = v), refresh),
        numField(`${t('Price per')} ${U.areaUnit()}`, s.price ? U.num(U.pricePerArea(s.price), 2) : '', cur, U.parsePricePerArea, (v) => (s.price = v), refresh)];
    }
    case 'paint': {
      const s = r.m.paint;
      const check = (label: string, on: boolean, set: (v: boolean) => void) => {
        const box = h('input', { type: 'checkbox' }) as HTMLInputElement;
        box.checked = on;
        box.addEventListener('change', () => { set(box.checked); refresh(); });
        return h('label', { class: 'check' }, box, h('span', {}, label));
      };
      return [
        check(t('Walls'), s.walls, (v) => (s.walls = v)),
        check(t('Ceiling'), s.ceiling, (v) => (s.ceiling = v)),
        numField(t('Coats'), String(s.coats), '', U.parsePlain, (v) => (s.coats = Math.round(v)), refresh),
        numField(t('Coverage'), U.coverageField(s.coverage), U.coverageUnit(), U.parseCoverage, (v) => (s.coverage = v), refresh),
        numField(`${t('Price per')} ${U.volUnit()}`, s.price ? U.num(U.pricePerVol(s.price), 2) : '', cur, U.parsePricePerVol, (v) => (s.price = v), refresh)];
    }
    case 'wallpaper': {
      const s = r.m.wallpaper;
      return [
        numField(t('Roll width'), U.smallField(s.rollW), U.smallUnit(), U.parseSmall, (v) => (s.rollW = v), refresh),
        numField(t('Roll length'), U.imperial() ? U.num(s.rollL / 0.3048, 1) : U.num(s.rollL, 2), U.lenUnit(), (x) => { const v = U.parsePlain(x); return U.imperial() ? v * 0.3048 : v; }, (v) => (s.rollL = v), refresh),
        numField(t('Pattern repeat'), s.repeat ? U.smallField(s.repeat) : '0', U.smallUnit(), U.parseSmall, (v) => (s.repeat = v), refresh),
        numField(t('Price per roll'), s.price ? U.num(s.price, 2) : '', cur, U.parsePlain, (v) => (s.price = v), refresh)];
    }
    case 'baseboard': {
      const s = r.m.baseboard;
      return [
        numField(t('Piece length'), U.imperial() ? U.num(s.piece / 0.3048, 1) : U.num(s.piece, 2), U.lenUnit(), (x) => { const v = U.parsePlain(x); return U.imperial() ? v * 0.3048 : v; }, (v) => (s.piece = v), refresh),
        numField(t('Waste'), pct(s.waste), '%', U.parsePlain, (v) => (s.waste = v), refresh),
        numField(t('Price per piece'), s.price ? U.num(s.price, 2) : '', cur, U.parsePlain, (v) => (s.price = v), refresh)];
    }
  }
}

// ---------------- shopping list ----------------
function listPage() {
  const all = rooms.map((r) => ({ r, res: compute(r) })).filter((x) => x.res.g.floor > 0 || x.res.g.wallNet > 0);
  const total = all.reduce((s, x) => s + x.res.cost, 0);
  const groups = MATERIALS.map((m) => {
    const items = all.filter((x) => x.res[m]);
    if (!items.length) return null;
    let head = '';
    if (m === 'flooring') { const a = items.reduce((s, x) => s + x.res.flooring!.area, 0), b = items.reduce((s, x) => s + x.res.flooring!.boxes, 0); head = `${U.area(a)}${b ? ` · ${b} ${t('boxes')}` : ''}`; }
    if (m === 'tile') head = `${U.int(items.reduce((s, x) => s + x.res.tile!.tiles, 0))} ${t('tiles')} · ${t('grout')} ${U.num(items.reduce((s, x) => s + x.res.tile!.groutKg, 0), 1)} kg`;
    if (m === 'paint') { const l = items.reduce((s, x) => s + x.res.paint!.litres, 0); head = `${U.volume(l)} · ${canText(l)}`; }
    if (m === 'wallpaper') head = `${items.reduce((s, x) => s + x.res.wallpaper!.rolls, 0)} ${t('rolls')}`;
    if (m === 'baseboard') { const l = items.reduce((s, x) => s + x.res.baseboard!.length, 0); head = `${U.len(l)} · ${items.reduce((s, x) => s + x.res.baseboard!.pieces, 0)} ${t('pieces')}`; }
    return { m, head, items };
  }).filter(Boolean) as { m: Material; head: string; items: typeof all }[];

  const text = () => [
    `${t('Shopping list')} — Roomcalc`,
    ...groups.map((g) => `${t(MAT[g.m].title)}: ${g.head}`),
    total > 0 ? `${t('Estimated cost')}: ${U.money(total)}` : '',
    '', ...all.map((x) => roomText(x.r, x.res)),
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');

  return h('div', { class: 'page list' },
    h('header', { class: 'top' },
      h('button', { class: 'back', onclick: () => go({ page: 'home' }) }, icon('back'), t('Rooms')),
      h('button', { class: 'icon-btn', 'aria-label': t('Share'), onclick: () => void shareText(t('Shopping list'), text()) }, icon('share'))),
    h('h1', { class: 'room-title static' }, t('Shopping list')),
    h('div', { class: 'muted small' }, `${all.length} ${t(all.length === 1 ? 'room' : 'rooms')}`),
    groups.length
      ? groups.map((g) => h('section', { class: `card mat m-${g.m}` },
          h('div', { class: 'card-head' }, h('span', { class: 'chip-ico' }, icon(MAT[g.m].icon)), h('b', {}, t(MAT[g.m].title))),
          h('div', { class: 'list-head' }, g.head),
          ...g.items.map((x) => h('button', { class: 'm-line link-line', onclick: () => go({ page: 'room', id: x.r.id }) },
            h('span', {}, x.r.name), h('b', {}, itemText(g.m, x.r, x.res))))))
      : h('div', { class: 'empty' }, h('b', {}, t('Nothing to buy yet')), h('p', {}, t('Enter a room size and pick materials.'))),
    total > 0 && h('div', { class: 'total' }, h('span', {}, t('Estimated cost')), h('b', {}, U.money(total))),
    h('button', { class: 'btn primary big wide', onclick: () => void shareText(t('Shopping list'), text()) }, icon('share'), t('Share list')));
}

function itemText(m: Material, r: Room, res: RoomResult) {
  switch (m) {
    case 'flooring': return res.flooring!.boxes ? `${res.flooring!.boxes} ${t('boxes')}` : U.area(res.flooring!.area);
    case 'tile': return `${U.int(res.tile!.tiles)} ${t('tiles')}`;
    case 'paint': return U.volume(res.paint!.litres);
    case 'wallpaper': return `${res.wallpaper!.rolls} ${t('rolls')}`;
    case 'baseboard': return `${res.baseboard!.pieces} × ${U.len(r.m.baseboard.piece)}`;
  }
}

// ---------------- settings ----------------
function segmented<T extends string>(options: [T, string][], current: T, on: (v: T) => void) {
  return h('div', { class: 'seg' }, options.map(([v, label]) => h('button', { class: v === current ? 'on' : '', onclick: () => on(v) }, label)));
}

function openSettings() {
  const body = h('div', { class: 'settings' });
  const draw = () => body.replaceChildren(
    h('h1', {}, t('Settings')),
    h('div', { class: 'set-row' }, h('b', {}, t('Units')),
      segmented<U.System>([['metric', t('Metric (m, m²)')], ['imperial', t('Imperial (ft, ft²)')]], U.units(), (v) => {
        if (v === U.units()) return;
        U.setUnits(v);
        // Fresh defaults (box sizes, tile sizes, roll sizes) follow the new system for materials still untouched.
        const def = defaultSettings(v === 'imperial'), old = defaultSettings(v !== 'imperial');
        for (const r of rooms) for (const m of MATERIALS) {
          const cur = r.m[m] as unknown as Record<string, number | boolean>, o = old[m] as unknown as Record<string, number | boolean>, d = def[m] as unknown as Record<string, number | boolean>;
          for (const k of Object.keys(d)) if (k !== 'on' && cur[k] === o[k]) cur[k] = d[k];
        }
        void saveNow(); draw(); render();
      })),
    h('div', { class: 'set-row' }, h('b', {}, t('Language')),
      segmented<LangPref>([['system', t('System')], ['en', 'English'], ['tr', 'Türkçe']], getLangPref(), (v) => { setLangPref(v); draw(); render(); })),
    h('div', { class: 'set-row' }, h('b', {}, t('Appearance')),
      segmented<Theme>([['system', t('System')], ['light', t('Light')], ['dark', t('Dark')]], getThemePref(), (v) => { setThemePref(v); statusBar(); draw(); render(); })),
    h('div', { class: 'about' },
      h('b', {}, 'Roomcalc 1.0'),
      h('p', {}, t('Everything stays on this iPhone. No account, no ads, no tracking.')),
      h('p', {}, t('Room scanning uses Apple RoomPlan and the LiDAR sensor; the camera image never leaves the phone.'))));
  draw();
  modal(body);
}

function statusBar() {
  if (!native) return;
  StatusBar.setStyle({ style: Style.Default }).catch(() => {});
}

/** Tapping outside a field closes the keyboard. */
function dismissKeyboard() {
  document.addEventListener('touchstart', (e) => {
    const el = e.target as HTMLElement;
    if (el.closest('input, textarea, button, label, summary')) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, { passive: true });
}

async function boot() {
  applyTheme();
  dismissKeyboard();
  [rooms, canScan] = await Promise.all([loadRooms(), scanSupported()]);
  render();
  if (native) {
    statusBar();
    Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {});
    SplashScreen.hide().catch(() => {});
    CapApp.addListener('appStateChange', (s) => { if (!s.isActive) void saveNow(); else if (rooms.some((r) => compute(r).g.floor > 0)) reviewMoment(); }).catch(() => {});
  }
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());
document.documentElement.lang = lang();
if (new URLSearchParams(location.search).has('selftest')) Object.assign(window, { __rooms: () => rooms, __go: go, __geometry: geometry });
void boot();
