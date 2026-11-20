# Writes store/listing.json (App Store name, subtitle, keywords, promo text, description) for 5 locales and checks Apple's limits.
# Usage: python -X utf8 scripts/listing.py
import json

DESC_EN = """Scan a room or type its size, and Roomcalc tells you exactly what to buy: flooring boxes, tiles and grout, litres or gallons of paint, wallpaper rolls and baseboard pieces. No account, no ads, no subscription.

SCAN WITH LIDAR
On iPhone Pro models, walk around the room once. Apple RoomPlan measures the floor area, every wall, the ceiling height, doors and windows.

OR TYPE THE SIZE
Works on every iPhone: length, width and ceiling height, extra parts for L-shaped rooms, areas you won't cover (cabinets, kitchen island, bathtub), doors and windows. Feet and inches or metres.

WHAT YOU GET
• Flooring and laminate: square footage with waste allowance, number of boxes
• Tile: tile count with joint width, boxes, grout in kg
• Paint: walls and/or ceiling, coats and coverage, the cans to buy
• Wallpaper: strips and rolls, with pattern repeat
• Baseboard and trim: total length and pieces, door openings left out
• Prices: add a price and see the estimated cost per room and in total

SHOPPING LIST
All rooms in one list, ready to share with a contractor or take to the store.

PRIVATE
Everything stays on your iPhone. The scan is processed on the device and never uploaded. Works offline."""

DESC_TR = """Odayı tarayın ya da ölçülerini yazın; Roomcalc tam olarak ne almanız gerektiğini söylesin: parke kutusu, fayans ve derz dolgusu, litre boya, duvar kâğıdı rulosu ve süpürgelik. Hesap yok, reklam yok, abonelik yok.

LIDAR İLE TARAYIN
iPhone Pro modellerinde odayı bir kez dolaşın. Apple RoomPlan zemin alanını, her duvarı, tavan yüksekliğini, kapı ve pencereleri ölçer.

YA DA ÖLÇÜLERİ YAZIN
Her iPhone'da çalışır: uzunluk, genişlik ve tavan yüksekliği, L şeklindeki odalar için ek bölümler, kaplanmayacak alanlar (dolap, mutfak adası, küvet), kapı ve pencereler. Metre ya da feet.

NELER HESAPLANIR
• Parke ve laminat: fire paylı metrekare, kutu sayısı
• Fayans: derz payıyla adet, kutu, kg cinsinden derz dolgusu
• Boya: duvar ve/veya tavan, kat ve kaplama alanı, alınacak kutular
• Duvar kâğıdı: şerit ve rulo sayısı, desen tekrarıyla
• Süpürgelik: toplam uzunluk ve parça, kapı açıklıkları düşülür
• Fiyatlar: fiyat girin, oda başına ve toplam tahmini tutarı görün

ALIŞVERİŞ LİSTESİ
Tüm odalar tek listede; ustaya göndermek ya da markete götürmek için hazır.

GİZLİ
Her şey iPhone'unuzda kalır. Tarama cihazda işlenir, hiçbir yere yüklenmez. İnternetsiz çalışır."""

DESC_ES = """Escanea una habitación o escribe sus medidas y Roomcalc te dice exactamente qué comprar: cajas de piso, azulejos y boquilla, litros de pintura, rollos de papel tapiz y zoclo. Sin cuenta, sin anuncios, sin suscripción.

ESCANEA CON LIDAR
En los iPhone Pro, recorre la habitación una vez. Apple RoomPlan mide el piso, cada pared, la altura del techo, puertas y ventanas.

O ESCRIBE LAS MEDIDAS
Funciona en cualquier iPhone: largo, ancho y alto, partes extra para habitaciones en L, zonas sin cubrir (muebles, isla, tina), puertas y ventanas. Metros o pies.

QUÉ OBTIENES
• Piso y laminado: metros cuadrados con desperdicio, número de cajas
• Azulejo: piezas con junta, cajas, boquilla en kg
• Pintura: paredes y/o techo, manos y rendimiento, botes a comprar
• Papel tapiz: tiras y rollos, con repetición del patrón
• Zoclo: longitud total y piezas, sin contar puertas
• Precios: calcula el costo por habitación y total

LISTA DE COMPRAS
Todas las habitaciones en una lista para compartir.

PRIVADO
Todo se queda en tu iPhone. El escaneo se procesa en el dispositivo. Funciona sin internet."""

DESC_PT = """Escaneie um cômodo ou digite as medidas e o Roomcalc diz exatamente o que comprar: caixas de piso, porcelanato e rejunte, litros de tinta, rolos de papel de parede e rodapé. Sem conta, sem anúncios, sem assinatura.

ESCANEIE COM LIDAR
Nos iPhone Pro, dê uma volta no cômodo. O Apple RoomPlan mede o piso, cada parede, o pé-direito, portas e janelas.

OU DIGITE AS MEDIDAS
Funciona em qualquer iPhone: comprimento, largura e altura, partes extras para cômodos em L, áreas sem revestimento (armários, ilha, banheira), portas e janelas. Metros ou pés.

O QUE VOCÊ RECEBE
• Piso e laminado: metros quadrados com perda, número de caixas
• Revestimento: peças com junta, caixas, rejunte em kg
• Tinta: paredes e/ou teto, demãos e rendimento, latas a comprar
• Papel de parede: faixas e rolos, com repetição do padrão
• Rodapé: comprimento total e peças, sem as portas
• Preços: custo estimado por cômodo e total

LISTA DE COMPRAS
Todos os cômodos em uma lista para compartilhar.

PRIVADO
Tudo fica no seu iPhone. O escaneamento é processado no aparelho. Funciona offline."""

DESC_DE = """Scanne einen Raum oder gib die Maße ein, und Roomcalc sagt dir genau, was du kaufen musst: Pakete Bodenbelag, Fliesen und Fugenmörtel, Liter Farbe, Tapetenrollen und Sockelleisten. Kein Konto, keine Werbung, kein Abo.

MIT LIDAR SCANNEN
Auf iPhone Pro Modellen einmal durch den Raum gehen. Apple RoomPlan misst Bodenfläche, jede Wand, Deckenhöhe, Türen und Fenster.

ODER MASSE EINGEBEN
Auf jedem iPhone: Länge, Breite und Höhe, Zusatzflächen für L-förmige Räume, nicht belegte Flächen (Schränke, Kücheninsel, Wanne), Türen und Fenster. Meter oder Fuß.

WAS DU BEKOMMST
• Laminat und Parkett: Quadratmeter mit Verschnitt, Anzahl Pakete
• Fliesen: Stückzahl mit Fugenbreite, Pakete, Fugenmörtel in kg
• Farbe: Wände und/oder Decke, Anstriche und Ergiebigkeit, Eimer
• Tapete: Bahnen und Rollen, mit Rapport
• Sockelleisten: Gesamtlänge und Stück, ohne Türöffnungen
• Preise: geschätzte Kosten pro Raum und gesamt

EINKAUFSLISTE
Alle Räume in einer Liste zum Teilen.

PRIVAT
Alles bleibt auf deinem iPhone. Der Scan wird auf dem Gerät verarbeitet. Funktioniert offline."""

L = {
    'en-US': dict(name='Roomcalc: Flooring & Paint', subtitle='Room scanner, tile, wallpaper',
                  keywords='calculator,square,footage,lidar,measure,estimate,laminate,carpet,drywall,baseboard,trim,area,sqft',
                  promo='Scan a room with LiDAR or type its size. Get flooring boxes, tiles, paint, wallpaper rolls and baseboard in seconds. No account, no ads, no subscription.',
                  description=DESC_EN),
    'tr': dict(name='Roomcalc: Parke ve Boya', subtitle='Oda tarama, fayans, metrekare',
               keywords='hesaplama,zemin,laminat,seramik,derz,süpürgelik,lidar,ölçü,tadilat,badana,alan,maliyet',
               promo='Odayı LiDAR ile tarayın ya da ölçüleri yazın. Parke, fayans, boya, duvar kâğıdı ve süpürgelik miktarı saniyeler içinde. Hesap, reklam, abonelik yok.',
               description=DESC_TR),
    'es-MX': dict(name='Roomcalc: Piso y Pintura', subtitle='Escáner de cuartos, azulejo',
                  keywords='calculadora,metros,cuadrados,laminado,papel,tapiz,zoclo,boquilla,medir,lidar,remodelación',
                  promo='Escanea una habitación con LiDAR o escribe sus medidas. Piso, azulejos, pintura, papel tapiz y zoclo en segundos. Sin cuenta, sin anuncios, sin suscripción.',
                  description=DESC_ES),
    'pt-BR': dict(name='Roomcalc: Piso e Tinta', subtitle='Escâner de cômodos, rejunte',
                  keywords='calculadora,metro,quadrado,laminado,porcelanato,revestimento,rodapé,papel,parede,medir,lidar',
                  promo='Escaneie um cômodo com LiDAR ou digite as medidas. Piso, revestimento, tinta, papel de parede e rodapé em segundos. Sem conta, sem anúncios, sem assinatura.',
                  description=DESC_PT),
    'de-DE': dict(name='Roomcalc: Boden & Farbe', subtitle='Raumscanner, Fliesen, Tapete',
                  keywords='rechner,quadratmeter,laminat,parkett,fugen,sockelleiste,tapezieren,messen,lidar,renovieren',
                  promo='Scanne einen Raum mit LiDAR oder gib die Maße ein. Bodenbelag, Fliesen, Farbe, Tapete und Sockelleisten in Sekunden. Kein Konto, keine Werbung, kein Abo.',
                  description=DESC_DE),
}

for loc, x in L.items():
    assert len(x['name']) <= 30, (loc, 'name', len(x['name']))
    assert len(x['subtitle']) <= 30, (loc, 'subtitle', len(x['subtitle']))
    assert len(x['keywords'].encode('utf-8')) <= 100, (loc, 'keywords', len(x['keywords'].encode('utf-8')))
    assert len(x['promo']) <= 170, (loc, 'promo', len(x['promo']))
    assert len(x['description']) <= 4000
    print(loc, len(x['name']), len(x['subtitle']), len(x['keywords'].encode('utf-8')), len(x['promo']))
json.dump(L, open('store/listing.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
