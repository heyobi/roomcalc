// Rooms are kept in one JSON file in the app's private Library folder (localStorage in a browser).
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { defaultSettings, type Room, type Settings } from './calc';
import { native } from './ui';
import { imperial } from './units';

const FILE = 'rooms.json';
const KEY = 'rc-rooms';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Fill in fields added in later versions so old saves keep working. */
function upgrade(r: Room): Room {
  const d = defaultSettings(imperial());
  const m = (r.m ?? {}) as Partial<Settings>;
  return {
    ...r,
    extras: r.extras ?? [],
    openings: r.openings ?? [],
    m: {
      flooring: { ...d.flooring, ...m.flooring },
      tile: { ...d.tile, ...m.tile },
      paint: { ...d.paint, ...m.paint },
      wallpaper: { ...d.wallpaper, ...m.wallpaper },
      baseboard: { ...d.baseboard, ...m.baseboard },
    },
  };
}

export async function loadRooms(): Promise<Room[]> {
  try {
    let text: string | null = null;
    if (native) {
      text = await Filesystem.readFile({ directory: Directory.Library, path: FILE, encoding: Encoding.UTF8 }).then((r) => r.data as string).catch(() => null);
    } else text = localStorage.getItem(KEY);
    const list = text ? (JSON.parse(text) as Room[]) : [];
    return list.map(upgrade).sort((a, b) => b.updated - a.updated);
  } catch {
    return [];
  }
}

let pending: Promise<unknown> = Promise.resolve();
/** Writes are queued so a quick series of edits never interleaves. */
export function saveRooms(rooms: Room[]): Promise<void> {
  const text = JSON.stringify(rooms);
  pending = pending.then(async () => {
    try {
      if (native) await Filesystem.writeFile({ directory: Directory.Library, path: FILE, data: text, encoding: Encoding.UTF8, recursive: true });
      else localStorage.setItem(KEY, text);
    } catch (e) { console.error('save failed', e); }
  });
  return pending as Promise<void>;
}

export function newRoom(name: string): Room {
  const imp = imperial();
  return {
    id: uid(), name, updated: Date.now(),
    length: 0, width: 0, height: imp ? 8 * 0.3048 : 2.5,
    extras: [], openings: [], m: defaultSettings(imp),
  };
}
