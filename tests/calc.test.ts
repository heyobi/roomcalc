import { describe, expect, it } from 'vitest';
import { baseboard, cans, compute, defaultSettings, flooring, geometry, paint, polygonArea, tile, wallpaper, type Room } from '../src/calc';

const room = (over: Partial<Room> = {}): Room => ({
  id: 'r', name: 'Test', updated: 0, length: 5, width: 4, height: 2.5, extras: [], openings: [], m: defaultSettings(false), ...over,
});

describe('geometry', () => {
  it('rectangle', () => {
    const g = geometry(room());
    expect(g.floor).toBe(20);
    expect(g.perimeter).toBe(18);
    expect(g.wallGross).toBe(45);
    expect(g.ceiling).toBe(20);
  });
  it('L-shape and excluded area', () => {
    const g = geometry(room({ extras: [{ id: 'a', kind: 'add', w: 2, d: 1.5 }, { id: 'b', kind: 'sub', w: 1, d: 0.6 }] }));
    expect(g.floor).toBeCloseTo(20 + 3 - 0.6);
    expect(g.perimeter).toBeCloseTo(18 + 3);
    expect(g.ceiling).toBeCloseTo(23);
  });
  it('doors and windows come off the walls', () => {
    const g = geometry(room({ openings: [{ id: 'd', kind: 'door', w: 0.8, h: 2, count: 1 }, { id: 'w', kind: 'window', w: 1.2, h: 1.2, count: 2 }] }));
    expect(g.openingsArea).toBeCloseTo(1.6 + 2.88);
    expect(g.wallNet).toBeCloseTo(45 - 4.48);
    expect(g.doorWidth).toBeCloseTo(0.8);
  });
  it('scanned room uses scan data', () => {
    const g = geometry(room({ height: 0, scan: { floorArea: 13.2, perimeter: 15, height: 2.4, walls: [{ w: 4, h: 2.4 }, { w: 3.5, h: 2.4 }, { w: 4, h: 2.4 }, { w: 3.5, h: 2.4 }] } }));
    expect(g.floor).toBe(13.2);
    expect(g.height).toBe(2.4);
    expect(g.wallGross).toBeCloseTo(15 * 2.4);
  });
});

describe('materials', () => {
  const g = geometry(room());
  it('flooring boxes include waste', () => {
    const r = flooring(g, { on: true, waste: 10, box: 2, price: 10 });
    expect(r.area).toBeCloseTo(22);
    expect(r.boxes).toBe(11);
    expect(r.cost).toBeCloseTo(220);
  });
  it('tiles count joints, grout uses the standard formula', () => {
    const r = tile(g, { on: true, waste: 10, tw: 0.6, th: 0.6, joint: 0.003, depth: 0.01, box: 1.44, price: 0 });
    expect(r.tiles).toBe(Math.ceil(22 / (0.603 * 0.603)));
    expect(r.boxes).toBe(16);
    // (600+600)/(600·600) × 10 × 3 × 1.6 = 0.16 kg/m²
    expect(r.groutKg).toBeCloseTo(0.16 * 20);
  });
  it('paint: two coats of walls at 10 m²/L', () => {
    const r = paint(g, { on: true, walls: true, ceiling: false, coats: 2, coverage: 10, price: 0 });
    expect(r.area).toBe(45);
    expect(r.litres).toBeCloseTo(9);
    const c = paint(g, { on: true, walls: true, ceiling: true, coats: 2, coverage: 10, price: 0 });
    expect(c.litres).toBeCloseTo(13);
  });
  it('wallpaper rolls with pattern repeat', () => {
    const r = wallpaper(g, { on: true, rollW: 0.53, rollL: 10.05, repeat: 0, price: 0 });
    expect(r.strips).toBe(34);
    expect(r.perRoll).toBe(3); // 2.6 m strips
    expect(r.rolls).toBe(12);
    const p = wallpaper(g, { on: true, rollW: 0.53, rollL: 10.05, repeat: 0.64, price: 0 });
    expect(p.stripLength).toBeCloseTo(3.2);
    expect(p.perRoll).toBe(3);
  });
  it('baseboard leaves out door openings', () => {
    const gd = geometry(room({ openings: [{ id: 'd', kind: 'door', w: 0.9, h: 2, count: 2 }] }));
    const r = baseboard(gd, { on: true, piece: 2.4, waste: 10, price: 5 });
    expect(r.length).toBeCloseTo((18 - 1.8) * 1.1);
    expect(r.pieces).toBe(8);
    expect(r.cost).toBe(40);
  });
  it('compute adds enabled materials only', () => {
    const r = compute(room());
    expect(r.flooring && r.paint && r.baseboard).toBeTruthy();
    expect(r.tile).toBeUndefined();
    expect(r.wallpaper).toBeUndefined();
  });
});

describe('helpers', () => {
  it('cans: few cans, little left over', () => {
    expect(cans(9, [10, 5, 2.5, 1])).toEqual([{ size: 10, n: 1 }]);
    expect(cans(6, [10, 5, 2.5, 1])).toEqual([{ size: 5, n: 1 }, { size: 1, n: 1 }]);
    expect(cans(17, [10, 5, 2.5, 1])).toEqual([{ size: 10, n: 1 }, { size: 5, n: 1 }, { size: 2.5, n: 1 }]);
    expect(cans(10, [10, 5, 2.5, 1])).toEqual([{ size: 10, n: 1 }]);
    expect(cans(0, [10])).toEqual([]);
  });
  it('polygon area', () => {
    expect(polygonArea([[0, 0], [4, 0], [4, 3], [0, 3]])).toBe(12);
  });
});
