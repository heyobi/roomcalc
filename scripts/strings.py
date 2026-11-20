# Builds Roomcalc/Localizable.xcstrings (English source, Turkish translations) and lists UI strings with no translation.
# Usage: python -X utf8 scripts/strings.py
import glob
import json
import re

TR = {
    'How much do I need?': 'Ne kadar lazım?',
    'Measure a room once. Get flooring, tile, paint, wallpaper and baseboard amounts in seconds.': 'Odayı bir kez ölçün. Parke, fayans, boya, duvar kâğıdı ve süpürgelik miktarları saniyeler içinde hazır.',
    'Scan a room': 'Odayı tara',
    'Enter size': 'Ölçü gir',
    'Room scanning works on iPhone Pro models with LiDAR. Typing the size works on every iPhone.': 'Oda tarama LiDAR\'lı iPhone Pro modellerinde çalışır. Ölçüleri yazmak her iPhone\'da çalışır.',
    'Shopping list': 'Alışveriş listesi',
    '%lld rooms': '%lld oda',
    'Rooms': 'Odalar', 'Room': 'Oda',
    'Living room': 'Salon', 'Bedroom': 'Yatak odası', 'Bathroom': 'Banyo',
    'No materials': 'Malzeme seçilmedi',
    'Size not entered yet': 'Ölçü henüz girilmedi',
    'No rooms yet': 'Henüz oda yok',
    'Add your first room to see what to buy.': 'Ne alacağınızı görmek için ilk odanızı ekleyin.',
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
    'Extra part: the other leg of an L-shaped room or an alcove. Not covered: floor you won\'t cover, like kitchen cabinets.': 'Ek bölüm: L şeklindeki odanın diğer kolu ya da bir girinti. Kaplanmayan alan: mutfak dolabı gibi kaplanmayacak zemin.',
    'Width': 'Genişlik', 'Depth': 'Derinlik', 'Length': 'Uzunluk', 'Height': 'Yükseklik',
    'Room size': 'Oda ölçüleri',
    'Scan this room instead': 'Bu odayı tara',
    'Doors and windows': 'Kapılar ve pencereler',
    'Taken off the wall area. Doors are also left out of baseboard and wallpaper.': 'Duvar alanından düşülür. Kapılar süpürgelik ve duvar kâğıdından da çıkarılır.',
    'Door': 'Kapı', 'Window': 'Pencere',
    'Sizes and prices': 'Ölçüler ve fiyatlar',
    'Rename': 'Yeniden adlandır', 'Rename room': 'Odayı yeniden adlandır', 'Name': 'Ad',
    'Duplicate': 'Kopyasını oluştur', 'Delete room': 'Odayı sil', 'Delete this room?': 'Bu oda silinsin mi?',
    'This room and its measurements are removed.': 'Bu oda ve ölçüleri silinir.',
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
    'Box covers': 'Bir kutu', 'Waste': 'Fire', 'Price per %@': 'Birim fiyat / %@',
    'Tile width': 'Fayans eni', 'Tile length': 'Fayans boyu', 'Joint': 'Derz', 'Tile thickness': 'Fayans kalınlığı',
    'Ceiling': 'Tavan', 'Coverage': 'Kaplama',
    'Roll width': 'Rulo eni', 'Roll length': 'Rulo boyu', 'Pattern repeat': 'Desen tekrarı', 'Price per roll': 'Rulo fiyatı',
    'Piece length': 'Parça boyu', 'Price per piece': 'Parça fiyatı',
    'Flooring': 'Parke / zemin', 'Tile': 'Fayans', 'Paint': 'Boya', 'Wallpaper': 'Duvar kâğıdı', 'Baseboard': 'Süpürgelik',
    'Nothing to buy yet': 'Henüz alınacak bir şey yok',
    'Enter a room size and pick materials.': 'Oda ölçülerini girip malzeme seçin.',
    'Units': 'Birimler', 'Metric (m, m²)': 'Metrik (m, m²)', 'Imperial (ft, ft²)': 'İngiliz (ft, ft²)',
    'Language': 'Dil', 'System': 'Sistem', 'Appearance': 'Görünüm', 'Light': 'Açık', 'Dark': 'Koyu',
    'Roomcalc follows your iPhone\'s language. You can pick another one for this app in Settings.': 'Roomcalc iPhone\'unuzun dilini kullanır. Bu uygulama için Ayarlar\'dan başka bir dil seçebilirsiniz.',
    'Version': 'Sürüm', 'Privacy policy': 'Gizlilik politikası',
    'Everything stays on this iPhone. No account, no ads, no tracking. Room scanning uses Apple RoomPlan and the LiDAR sensor; the camera image never leaves the phone.': 'Her şey bu iPhone\'da kalır. Hesap yok, reklam yok, takip yok. Oda tarama Apple RoomPlan ve LiDAR sensörünü kullanır; kamera görüntüsü telefondan çıkmaz.',
    'Cancel': 'Vazgeç', 'Done': 'Bitti', 'Use scan': 'Taramayı kullan',
}

# Literals that are not UI text (symbols, keys, units, formats).
IGNORE = re.compile(r'^(|[ ]|[a-z0-9.]+(\.[a-z0-9.]+)*|.*\\\(.*|[%@×·—•:]+.*|-demo|AccentColor|CFBundleShortVersionString|https?://.*|0|ft|in|m|cm|mm|ft²|m²|L|gal|qt|kg|USD|\$|1 qt|1 gal|5 gal|units\.imperial|appearance|system|light|dark|Roomcalc|rooms(-demo)?\.json|toggle-.*|stats|scan|enterSize|shoppingList)$')

found = set()
for f in glob.glob('Roomcalc/*.swift'):
    src = open(f, encoding='utf-8').read()
    for m in re.finditer(r'"((?:[^"\\\n]|\\.)*)"', src):
        found.add(m.group(1))
missing = sorted(s for s in found if s not in TR and not IGNORE.match(s))
print('untranslated literals:', missing)

strings = {}
for k, v in TR.items():
    strings[k] = {'localizations': {'tr': {'stringUnit': {'state': 'translated', 'value': v}}}}
cat = {'sourceLanguage': 'en', 'strings': dict(sorted(strings.items())), 'version': '1.0'}
json.dump(cat, open('Roomcalc/Localizable.xcstrings', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(len(strings), 'strings written')
