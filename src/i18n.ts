// Interface language (English / Turkish) and appearance (system / light / dark). Both are per-device preferences.
// Strings are keyed by their English text; a missing translation falls back to English.

export type Lang = 'en' | 'tr';
export type LangPref = 'system' | Lang;
export type Theme = 'system' | 'light' | 'dark';

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

let langPref = (read('rc-lang') as LangPref) || 'system';
let themePref = (read('rc-theme') as Theme) || 'system';

export const getLangPref = () => langPref;
export const getThemePref = () => themePref;
export const lang = (): Lang => (langPref === 'system' ? (navigator.language || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en' : langPref);

export function setLangPref(v: LangPref) { langPref = v; write('rc-lang', v); document.documentElement.lang = lang(); }
export function setThemePref(v: Theme) { themePref = v; write('rc-theme', v); applyTheme(); }

export function isDark(): boolean {
  if (themePref === 'dark') return true;
  if (themePref === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
export function applyTheme() {
  const r = document.documentElement;
  if (themePref === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', themePref);
  r.style.colorScheme = isDark() ? 'dark' : 'light';
}
applyTheme();
document.documentElement.lang = lang();


const TR: Record<string, string> = {
  'How much do I need?': 'Ne kadar lazım?',
  'Measure a room once. Get flooring, tile, paint, wallpaper and baseboard amounts in seconds.': 'Odayı bir kez ölçün. Parke, fayans, boya, duvar kâğıdı ve süpürgelik miktarları saniyeler içinde hazır.',
  'Scan a room': 'Odayı tara',
  'Enter size': 'Ölçü gir',
  'Room scanning works on iPhone Pro models with LiDAR. Typing the size works on every iPhone.': 'Oda tarama LiDAR\'lı iPhone Pro modellerinde çalışır. Ölçüleri yazmak her iPhone\'da çalışır.',
  'Shopping list': 'Alışveriş listesi',
  'room': 'oda', 'rooms': 'oda', 'Rooms': 'Odalar', 'Room': 'Oda',
  'No materials': 'Malzeme seçilmedi',
  'Size not entered yet': 'Ölçü henüz girilmedi',
  'No rooms yet': 'Henüz oda yok',
  'Add your first room to see what to buy.': 'Ne alacağınızı görmek için ilk odanızı ekleyin.',
  'Room scanned': 'Oda tarandı',
  'Scan failed': 'Tarama başarısız',
  'Settings': 'Ayarlar',
  'Floor': 'Zemin', 'Walls': 'Duvarlar', 'Perimeter': 'Çevre',
  'Scanned with LiDAR': 'LiDAR ile tarandı',
  'Floor area': 'Zemin alanı', 'Wall length': 'Duvar uzunluğu', 'Walls found': 'Bulunan duvar',
  'Ceiling height': 'Tavan yüksekliği',
  'Type the size instead?': 'Ölçüleri elle mi yazacaksınız?',
  'The scan is replaced by length and width you type. Doors and windows are kept.': 'Tarama yerine yazdığınız uzunluk ve genişlik kullanılır. Kapı ve pencereler kalır.',
  'Type size': 'Elle yaz', 'Type the size instead': 'Ölçüleri elle yaz',
  'Extra part (L-shape, alcove)': 'Ek bölüm (L şekli, girinti)',
  'Not covered (cabinets, island, tub)': 'Kaplanmayan alan (dolap, ada, küvet)',
  'Extra part': 'Ek bölüm', 'Not covered': 'Kaplanmayan alan',
  'Delete': 'Sil', 'Width': 'Genişlik', 'Depth': 'Derinlik', 'Length': 'Uzunluk', 'Height': 'Yükseklik',
  'Room size': 'Oda ölçüleri',
  'Scan this room instead': 'Bu odayı tara',
  'Doors and windows': 'Kapılar ve pencereler', 'taken off the walls': 'duvardan düşülür',
  'Door': 'Kapı', 'Window': 'Pencere',
  'Sizes and prices': 'Ölçüler ve fiyatlar',
  'Share': 'Paylaş', 'More': 'Diğer', 'Rename': 'Yeniden adlandır', 'Rename room': 'Odayı yeniden adlandır', 'Name': 'Ad',
  'Duplicate': 'Kopyasını oluştur', 'Delete room': 'Odayı sil',
  'This room and its measurements are removed.': 'Bu oda ve ölçüleri silinir.',
  'Edited': 'Düzenlendi',
  'What are you buying?': 'Ne alacaksınız?',
  'Amounts include the waste allowance you set. Check sizes and coverage on the product label before you buy.': 'Miktarlara belirlediğiniz fire payı dahildir. Almadan önce ürün etiketindeki ölçü ve kaplama alanını kontrol edin.',
  'Enter the room size first.': 'Önce oda ölçülerini girin.',
  'Enter the ceiling height first.': 'Önce tavan yüksekliğini girin.',
  'to buy': 'alınacak', 'boxes': 'kutu', 'tiles': 'fayans', 'rolls': 'rulo', 'pieces': 'parça', 'total': 'toplam', 'of paint': 'boya', 'grout': 'derz dolgusu',
  'Waste allowance': 'Fire payı', 'Cost': 'Tutar', 'Estimated cost': 'Tahmini tutar',
  'Tile size': 'Fayans ölçüsü', 'Area with waste': 'Fire dahil alan', 'Grout': 'Derz dolgusu',
  'Cans': 'Kutular', 'Area to paint': 'Boyanacak alan', 'Coats': 'Kat',
  'Strips': 'Şerit', 'Strips per roll': 'Rulo başına şerit',
  'Door openings left out': 'Düşülen kapı açıklığı',
  'Box covers': 'Bir kutu', 'Waste': 'Fire', 'Price per': 'Birim fiyat /',
  'Tile width': 'Fayans eni', 'Tile length': 'Fayans boyu', 'Joint': 'Derz', 'Tile thickness': 'Fayans kalınlığı',
  'Ceiling': 'Tavan', 'Coverage': 'Kaplama',
  'Roll width': 'Rulo eni', 'Roll length': 'Rulo boyu', 'Pattern repeat': 'Desen tekrarı', 'Price per roll': 'Rulo fiyatı',
  'Piece length': 'Parça boyu', 'Price per piece': 'Parça fiyatı',
  'Flooring': 'Parke / zemin', 'Tile': 'Fayans', 'Paint': 'Boya', 'Wallpaper': 'Duvar kâğıdı', 'Baseboard': 'Süpürgelik',
  'Nothing to buy yet': 'Henüz alınacak bir şey yok',
  'Enter a room size and pick materials.': 'Oda ölçülerini girip malzeme seçin.',
  'Share list': 'Listeyi paylaş',
  'Units': 'Birimler', 'Metric (m, m²)': 'Metrik (m, m²)', 'Imperial (ft, ft²)': 'İngiliz (ft, ft²)',
  'Language': 'Dil', 'System': 'Sistem', 'Appearance': 'Görünüm', 'Light': 'Açık', 'Dark': 'Koyu',
  'Everything stays on this iPhone. No account, no ads, no tracking.': 'Her şey bu iPhone\'da kalır. Hesap yok, reklam yok, takip yok.',
  'Room scanning uses Apple RoomPlan and the LiDAR sensor; the camera image never leaves the phone.': 'Oda tarama Apple RoomPlan ve LiDAR sensörünü kullanır; kamera görüntüsü telefondan çıkmaz.',
  'Cancel': 'Vazgeç', 'OK': 'Tamam', 'Copied': 'Kopyalandı', 'Type a name first.': 'Önce bir ad yazın.',
};

export function t(s: string): string {
  return lang() === 'tr' ? TR[s] ?? s : s;
}
