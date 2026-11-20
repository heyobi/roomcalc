// Metric / imperial display and input. Values are stored in metres; only what the user sees and types changes.
import { lang } from './i18n';

export type System = 'metric' | 'imperial';
const FT = 0.3048, IN = 0.0254, FT2 = FT * FT, GAL = 3.785411784;

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const region = () => (navigator.language || 'en-US').split('-')[1]?.toUpperCase() ?? '';
let sys: System = (read('rc-units') as System) || (['US', 'LR', 'MM'].includes(region()) ? 'imperial' : 'metric');
export const units = () => sys;
export const imperial = () => sys === 'imperial';
export function setUnits(v: System) { sys = v; try { localStorage.setItem('rc-units', v); } catch { /* ignore */ } }

const locale = () => (lang() === 'tr' ? 'tr-TR' : navigator.language || 'en-US');
export const num = (x: number, d = 1) => x.toLocaleString(locale(), { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const int = (x: number) => Math.round(x).toLocaleString(locale());

/** Room-size lengths: 4.25 m · 13′ 11″ */
export function len(m: number): string {
  if (!imperial()) return `${num(m, m >= 10 ? 1 : 2)} m`;
  let inches = Math.round(m / IN);
  const ft = Math.floor(inches / 12);
  inches -= ft * 12;
  return inches ? `${ft}′ ${inches}″` : `${ft}′`;
}
/** Small sizes (doors, tiles, rolls): 80 cm · 32″ */
export function small(m: number): string {
  return imperial() ? `${num(m / IN, 1)}″` : `${num(m * 100, 1)} cm`;
}
export function mm(m: number): string { return imperial() ? `${num(m / IN, 3)}″` : `${num(m * 1000, 1)} mm`; }
export function area(m2: number, d = 1): string { return imperial() ? `${num(m2 / FT2, 0)} ft²` : `${num(m2, d)} m²`; }
export function volume(l: number): string { return imperial() ? `${num(l / GAL, 1)} gal` : `${num(l, 1)} L`; }
export const areaUnit = () => (imperial() ? 'ft²' : 'm²');
export const lenUnit = () => (imperial() ? 'ft' : 'm');
export const smallUnit = () => (imperial() ? 'in' : 'cm');
export const volUnit = () => (imperial() ? 'gal' : 'L');

/** Paint can sizes for the current system, in litres. */
export const canSizes = () => (imperial() ? [5 * GAL, GAL, GAL / 4] : [10, 5, 2.5, 1]);
export function canLabel(l: number): string {
  if (!imperial()) return `${num(l, 1)} L`;
  const g = l / GAL;
  return g >= 4.9 ? '5 gal' : g >= 0.99 ? '1 gal' : '1 qt';
}

const parseNum = (s: string) => Number(s.replace(',', '.'));

/** Parse a room length: "4.25", "4,25" (m) · "12.5", "12'6", "12' 6\"", "12 6" (ft/in). NaN when invalid. */
export function parseLen(s: string): number {
  s = s.trim();
  if (!s) return NaN;
  if (!imperial()) { const v = parseNum(s.replace(/\s*m$/i, '')); return v >= 0 ? v : NaN; }
  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(?:'|′|ft)?\s*(?:(\d+(?:[.,]\d+)?)\s*(?:"|″|in)?)?$/i);
  if (!m) return NaN;
  return parseNum(m[1]) * FT + (m[2] ? parseNum(m[2]) * IN : 0);
}
export function parseSmall(s: string): number {
  const v = parseNum(s.trim().replace(/\s*(cm|in|"|″)$/i, ''));
  return v >= 0 ? (imperial() ? v * IN : v / 100) : NaN;
}
export function parseMm(s: string): number {
  const v = parseNum(s.trim().replace(/\s*(mm|in|"|″)$/i, ''));
  return v >= 0 ? (imperial() ? v * IN : v / 1000) : NaN;
}
export function parseArea(s: string): number { const v = parseNum(s.trim()); return v >= 0 ? (imperial() ? v * FT2 : v) : NaN; }
export function parseVolume(s: string): number { const v = parseNum(s.trim()); return v >= 0 ? (imperial() ? v * GAL : v) : NaN; }

/** Editable text for an input: plain numbers in the field's unit. */
export const lenField = (m: number) => (m ? (imperial() ? (() => { const t = len(m); return t.replace(/′/, "'").replace(/″/, '"'); })() : num(m, 2)) : '');
export const smallField = (m: number) => (m ? (imperial() ? num(m / IN, 2) : num(m * 100, 1)) : '');
export const mmField = (m: number) => (imperial() ? num(m / IN, 3) : num(m * 1000, 1));
export const areaField = (m2: number) => (imperial() ? num(m2 / FT2, 1) : num(m2, 2));
/** Paint coverage: m²/L or ft²/gal */
export const coverageField = (c: number) => (imperial() ? num((c / FT2) * GAL, 0) : num(c, 1));
export const parseCoverage = (s: string) => { const v = parseNum(s.trim()); return v > 0 ? (imperial() ? (v * FT2) / GAL : v) : NaN; };
export const coverageUnit = () => (imperial() ? 'ft²/gal' : 'm²/L');

// Prices are per unit of the current system (per m² or ft², per L or gal). Stored per metric unit.
export const pricePerArea = (p: number) => (imperial() ? p * FT2 : p);
export const parsePricePerArea = (s: string) => { const v = parseNum(s.trim()); return v >= 0 ? (imperial() ? v / FT2 : v) : NaN; };
export const pricePerVol = (p: number) => (imperial() ? p * GAL : p);
export const parsePricePerVol = (s: string) => { const v = parseNum(s.trim()); return v >= 0 ? (imperial() ? v / GAL : v) : NaN; };
export const parsePlain = (s: string) => { const v = parseNum(s.trim()); return v >= 0 ? v : NaN; };

const CURRENCY: Record<string, string> = { US: 'USD', TR: 'TRY', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD', IN: 'INR', JP: 'JPY', CH: 'CHF', MX: 'MXN', BR: 'BRL', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', AT: 'EUR', BE: 'EUR', IE: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN' };
export function money(x: number): string {
  const cur = CURRENCY[region()] ?? (lang() === 'tr' ? 'TRY' : undefined);
  try { if (cur) return x.toLocaleString(locale(), { style: 'currency', currency: cur, maximumFractionDigits: x >= 100 ? 0 : 2 }); } catch { /* ignore */ }
  return num(x, 2);
}
