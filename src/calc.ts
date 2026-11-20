// Room geometry and material quantities. Everything here is metric (metres, m², litres); units.ts converts for display.
// Pure functions only, so tests/calc.test.ts can check every formula.

export type OpeningKind = 'door' | 'window';
export interface Opening { id: string; kind: OpeningKind; w: number; h: number; count: number }
/** add: an alcove or the other leg of an L-shaped room (adds floor and 2 × depth of wall). sub: cabinets, an island, a bathtub (floor only). */
export interface Extra { id: string; kind: 'add' | 'sub'; w: number; d: number }
export interface ScanData { floorArea: number; perimeter: number; height: number; walls: { w: number; h: number }[] }

export interface Settings {
  flooring: { on: boolean; waste: number; box: number; price: number };
  tile: { on: boolean; waste: number; tw: number; th: number; joint: number; depth: number; box: number; price: number };
  paint: { on: boolean; walls: boolean; ceiling: boolean; coats: number; coverage: number; price: number };
  wallpaper: { on: boolean; rollW: number; rollL: number; repeat: number; price: number };
  baseboard: { on: boolean; piece: number; waste: number; price: number };
}
export type Material = keyof Settings;
export const MATERIALS: Material[] = ['flooring', 'tile', 'paint', 'wallpaper', 'baseboard'];

export interface Room {
  id: string;
  name: string;
  updated: number;
  length: number;
  width: number;
  height: number;
  extras: Extra[];
  openings: Opening[];
  scan?: ScanData;
  m: Settings;
}

export function defaultSettings(imperial: boolean): Settings {
  return {
    flooring: { on: true, waste: 10, box: imperial ? 20 * 0.09290304 : 2.0, price: 0 },
    // 60 × 60 cm porcelain, or 12 × 24 in; 3 mm (1/8 in) joints; 10 mm thick.
    tile: { on: false, waste: 10, tw: imperial ? 0.3048 : 0.6, th: imperial ? 0.6096 : 0.6, joint: imperial ? 0.003175 : 0.003, depth: 0.01, box: imperial ? 16 * 0.09290304 : 1.44, price: 0 },
    // 10 m²/L per coat ≈ 400 ft²/gal.
    paint: { on: true, walls: true, ceiling: false, coats: 2, coverage: imperial ? 400 * 0.09290304 / 3.785411784 : 10, price: 0 },
    // European roll 0.53 × 10.05 m; US double roll 20.5 in × 33 ft.
    wallpaper: { on: false, rollW: imperial ? 0.5207 : 0.53, rollL: imperial ? 10.0584 : 10.05, repeat: 0, price: 0 },
    baseboard: { on: true, piece: imperial ? 2.4384 : 2.4, waste: 10, price: 0 },
  };
}

export interface Geometry { floor: number; perimeter: number; height: number; wallGross: number; openingsArea: number; wallNet: number; ceiling: number; doorWidth: number }

export function geometry(r: Room): Geometry {
  const openingsArea = r.openings.reduce((s, o) => s + o.w * o.h * o.count, 0);
  const doorWidth = r.openings.filter((o) => o.kind === 'door').reduce((s, o) => s + o.w * o.count, 0);
  let floor: number, perimeter: number, height: number, wallGross: number;
  if (r.scan) {
    floor = r.scan.floorArea;
    perimeter = r.scan.perimeter;
    height = r.height || r.scan.height;
    wallGross = r.scan.walls.length ? r.scan.walls.reduce((s, w) => s + w.w * (r.height || w.h), 0) : perimeter * height;
  } else {
    height = r.height;
    floor = r.length * r.width;
    perimeter = r.length > 0 && r.width > 0 ? 2 * (r.length + r.width) : 0;
    for (const e of r.extras) {
      if (e.kind === 'add') { floor += e.w * e.d; perimeter += 2 * e.d; } else floor -= e.w * e.d;
    }
    floor = Math.max(0, floor);
    wallGross = perimeter * height;
  }
  const ceiling = r.scan ? r.scan.floorArea : Math.max(0, r.length * r.width + r.extras.filter((e) => e.kind === 'add').reduce((s, e) => s + e.w * e.d, 0));
  return { floor, perimeter, height, wallGross, openingsArea, wallNet: Math.max(0, wallGross - openingsArea), ceiling, doorWidth };
}

const up = (x: number) => (x > 0 ? Math.ceil(x - 1e-9) : 0);

export interface FlooringResult { area: number; boxes: number; cost: number }
export function flooring(g: Geometry, s: Settings['flooring']): FlooringResult {
  const area = g.floor * (1 + s.waste / 100);
  const boxes = s.box > 0 ? up(area / s.box) : 0;
  return { area, boxes, cost: s.price * (boxes && s.box ? boxes * s.box : area) };
}

export interface TileResult { area: number; tiles: number; boxes: number; groutKg: number; cost: number }
export function tile(g: Geometry, s: Settings['tile']): TileResult {
  const area = g.floor * (1 + s.waste / 100);
  const cell = (s.tw + s.joint) * (s.th + s.joint);
  const tiles = cell > 0 ? up(area / cell) : 0;
  const boxes = s.box > 0 ? up(area / s.box) : 0;
  // Grout (kg/m²) = (A + B) / (A × B) × thickness × joint × 1.6, with A, B, thickness and joint in mm. Uses the net floor.
  const A = s.tw * 1000, B = s.th * 1000;
  const groutKg = A > 0 && B > 0 ? ((A + B) / (A * B)) * s.depth * 1000 * s.joint * 1000 * 1.6 * g.floor : 0;
  return { area, tiles, boxes, groutKg, cost: s.price * (boxes && s.box ? boxes * s.box : area) };
}

export interface PaintResult { area: number; litres: number; cost: number }
export function paint(g: Geometry, s: Settings['paint']): PaintResult {
  const area = (s.walls ? g.wallNet : 0) + (s.ceiling ? g.ceiling : 0);
  const litres = s.coverage > 0 ? (area * s.coats) / s.coverage : 0;
  return { area, litres, cost: s.price * litres };
}

/** Cans that cover the need: few cans, little left over. sizes in the same unit as need. */
export function cans(need: number, sizes: number[]): { size: number; n: number }[] {
  if (need <= 0) return [];
  const sorted = [...sizes].sort((a, b) => b - a);
  let best: { score: number; combo: number[] } | null = null;
  const big = sorted[0];
  const maxBig = Math.ceil(need / big);
  // Small search: up to maxBig big cans, then up to 4 of each smaller size.
  const rec = (i: number, total: number, combo: number[]) => {
    if (total >= need - 1e-9) {
      // Leftover paint and every extra can both cost money: score = leftover share + 0.12 per can.
      const count = combo.reduce((a, b) => a + b, 0), score = (total - need) / need + 0.12 * count;
      if (!best || score < best.score - 1e-9) best = { score, combo: [...combo] };
      return;
    }
    if (i >= sorted.length) return;
    const lim = i === 0 ? maxBig : 4;
    for (let n = 0; n <= lim; n++) { combo[i] = n; rec(i + 1, total + n * sorted[i], combo); }
    combo[i] = 0;
  };
  rec(0, 0, sorted.map(() => 0));
  const b = best as { combo: number[] } | null;
  return b ? sorted.map((size, i) => ({ size, n: b.combo[i] })).filter((x) => x.n > 0) : [];
}

export interface WallpaperResult { strips: number; stripLength: number; perRoll: number; rolls: number; cost: number }
export function wallpaper(g: Geometry, s: Settings['wallpaper']): WallpaperResult {
  const run = Math.max(0, g.perimeter - g.doorWidth);
  const strips = s.rollW > 0 ? up(run / s.rollW) : 0;
  // Each strip: wall height + 10 cm for trimming, rounded up to whole pattern repeats.
  let stripLength = g.height + 0.1;
  if (s.repeat > 0) stripLength = Math.ceil(stripLength / s.repeat - 1e-9) * s.repeat;
  const perRoll = stripLength > 0 ? Math.floor(s.rollL / stripLength + 1e-9) : 0;
  const rolls = perRoll > 0 ? up(strips / perRoll) : 0;
  return { strips, stripLength, perRoll, rolls, cost: s.price * rolls };
}

export interface BaseboardResult { length: number; pieces: number; cost: number }
export function baseboard(g: Geometry, s: Settings['baseboard']): BaseboardResult {
  const length = Math.max(0, g.perimeter - g.doorWidth) * (1 + s.waste / 100);
  const pieces = s.piece > 0 ? up(length / s.piece) : 0;
  return { length, pieces, cost: s.price * pieces };
}

export interface RoomResult { g: Geometry; flooring?: FlooringResult; tile?: TileResult; paint?: PaintResult; wallpaper?: WallpaperResult; baseboard?: BaseboardResult; cost: number }
export function compute(r: Room): RoomResult {
  const g = geometry(r);
  const out: RoomResult = { g, cost: 0 };
  if (r.m.flooring.on) out.flooring = flooring(g, r.m.flooring);
  if (r.m.tile.on) out.tile = tile(g, r.m.tile);
  if (r.m.paint.on) out.paint = paint(g, r.m.paint);
  if (r.m.wallpaper.on) out.wallpaper = wallpaper(g, r.m.wallpaper);
  if (r.m.baseboard.on) out.baseboard = baseboard(g, r.m.baseboard);
  out.cost = (out.flooring?.cost ?? 0) + (out.tile?.cost ?? 0) + (out.paint?.cost ?? 0) + (out.wallpaper?.cost ?? 0) + (out.baseboard?.cost ?? 0);
  return out;
}

/** Floor area of a closed polygon given as [x, y] points (shoelace). */
export function polygonArea(pts: [number, number][]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length]; s += x1 * y2 - x2 * y1; }
  return Math.abs(s) / 2;
}
