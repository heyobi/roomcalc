// End-to-end check of the production build in WebKit (the iPhone engine), phone-sized, no network.
// APP_URL=http://localhost:4183/?selftest&scan node tests/webkit/app.mjs [screenshotDir]
import { webkit } from 'playwright';

const URL = process.env.APP_URL || 'http://localhost:4183/?selftest&scan';
const shots = process.argv[2];
const b = await webkit.launch();
let failed = 0;
const ok = (cond, msg, extra = '') => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg} ${extra}`); if (!cond) failed++; };

async function run(locale, scheme) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale, colorScheme: scheme });
  await ctx.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL);
  await p.waitForSelector('.hero');
  const shot = async (name) => { if (shots) await p.screenshot({ path: `${shots}/${locale}-${scheme}-${name}.png`, fullPage: true }); };
  await shot('home-empty');

  // Manual room: 5 × 4 m, 2.5 m high
  await p.click('.hero-actions .btn:nth-child(2)');
  await p.waitForSelector('.page.room');
  const fields = p.locator('.size .field input');
  await fields.nth(0).fill('5');
  await fields.nth(1).fill('4');
  await fields.nth(2).fill('2,5');
  const stats = async () => (await p.locator('.stat b').allTextContents()).map((s) => s.replace(/\s/g, ' '));
  let st = await stats();
  ok(st[0].startsWith('20'), 'floor area 20 m²', st[0]);
  ok(st[1].startsWith('45'), 'wall area 45 m²', st[1]);
  ok(st[2].startsWith('18'), 'perimeter 18 m', st[2]);

  // A door comes off the walls
  await p.click('.openings .row-btns .btn:first-child');
  st = await stats();
  ok(st[1].startsWith('43,4') || st[1].startsWith('43.4'), 'door taken off walls', st[1]);

  // Results for the default materials
  const big = async (m) => (await p.locator(`.mat.m-${m} .big-n b`).allTextContents());
  ok((await big('flooring'))[0].startsWith('22'), 'flooring 22 m² with 10% waste', (await big('flooring')).join('|'));
  ok((await big('flooring'))[1] === '11', '11 boxes of 2 m²');
  const paintL = (await big('paint'))[0];
  ok(/^8[,.]7/.test(paintL), 'paint ≈ 8.7 L', paintL);

  // Turn on tile, set 30 × 60
  await p.click('.toggle.m-tile');
  ok(await p.locator('.mat.m-tile').count() === 1, 'tile card appears');
  await p.click('.mat.m-tile summary');
  const tf = p.locator('.mat.m-tile .field input');
  await tf.nth(0).fill('30');
  await tf.nth(1).fill('60');
  const tiles = (await big('tile'))[0].replace(/\D/g, '');
  ok(tiles === String(Math.ceil(22 / (0.303 * 0.603))), 'tile count with joints', tiles);
  // A price shows a total
  await p.click('.mat.m-flooring summary');
  await p.locator('.mat.m-flooring .field input').nth(2).fill('20');
  ok(await p.locator('.total b').isVisible(), 'estimated cost shown', await p.locator('.total b').textContent());
  await shot('room');

  // Back home, room listed; shopping list
  await p.click('.back');
  await p.waitForSelector('.room-row');
  ok(await p.locator('.room-row').count() === 1, 'room listed');
  await p.click('.list-card');
  await p.waitForSelector('.page.list');
  ok(await p.locator('.page.list .card.mat').count() === 4, 'shopping list groups 4 materials');
  await shot('list');
  await p.click('.back');

  // Scan (demo data in the browser)
  await p.click('.hero-actions .btn:first-child');
  await p.waitForSelector('.page.room .size .kv');
  st = await stats();
  ok(st[0].startsWith('14'), 'scanned floor area', st[0]);
  ok(await p.locator('.opening').count() === 2, 'scanned door and window imported');
  await shot('scanned');
  await p.click('.back');

  // Persists across reload
  await p.waitForTimeout(600);
  await p.reload();
  await p.waitForSelector('.room-row');
  ok(await p.locator('.room-row').count() === 2, 'rooms saved after reload');
  await shot('home');

  // Imperial
  await p.click('.top .icon-btn');
  await p.locator('.seg').first().locator('button').nth(1).click();
  await p.click('.modal-close');
  await p.waitForTimeout(300);
  const sub = await p.locator('.room-row small').last().textContent();
  ok(/ft²/.test(sub), 'imperial units', sub);
  await p.locator('.room-row').last().click();
  const pair = await p.locator('.size .f-pair').count();
  ok(pair === 3, 'feet + inches inputs', String(pair));
  if (scheme === 'dark') await shot('imperial');

  ok(errors.length === 0, 'no page errors', errors.join(' | '));
  await ctx.close();
}

async function usDefaults() {
  // US locale starts in feet: 16' × 13' room, 8' ceiling.
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.click('.hero-actions .btn:nth-child(2)');
  const f = p.locator('.size .f-pair input');
  await f.nth(0).fill('16');
  await f.nth(2).fill('13');
  await f.nth(3).fill('6');
  const st = (await p.locator('.stat b').allTextContents());
  ok(st[0] === '216 ft²', 'US: feet by default, 16′ × 13′ 6″ = 216 ft²', st[0]);
  ok(st[2] === '59′', 'US: perimeter 59′', st[2]);
  const paint = (await p.locator('.mat.m-paint .big-n b').allTextContents())[0];
  ok(/gal$/.test(paint), 'US: paint in gallons', paint);
  await ctx.close();
}

await run('en-GB', 'light');
await run('tr-TR', 'dark');
await usDefaults();
await b.close();
console.log(failed ? `${failed} FAILED` : 'ALL OK');
process.exit(failed ? 1 : 0);
