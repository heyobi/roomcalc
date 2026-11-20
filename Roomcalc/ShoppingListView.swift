import SwiftUI

enum ShareText {
    static func lines(_ r: Room, _ res: Calc.RoomResult, _ u: Units) -> [String] {
        var out: [String] = []
        if let f = res.flooring { out.append("\(Material.flooring.titleText): \(u.area(f.area))" + (f.boxes > 0 ? " (\(f.boxes) \(String(localized: "boxes")))" : "")) }
        if let t = res.tile {
            out.append("\(Material.tile.titleText): \(u.int(t.tiles)) \(String(localized: "tiles")) \(u.small(r.m.tile.tw)) × \(u.small(r.m.tile.th))"
                + (t.boxes > 0 ? " (\(t.boxes) \(String(localized: "boxes")))" : "") + ", \(String(localized: "grout")) \(u.num(t.groutKg, 1)) kg")
        }
        if let p = res.paint, p.litres > 0 { out.append("\(Material.paint.titleText): \(u.volume(p.litres)) — \(u.cansText(p.litres))") }
        if let w = res.wallpaper { out.append("\(Material.wallpaper.titleText): \(w.rolls) \(String(localized: "rolls"))") }
        if let b = res.baseboard { out.append("\(Material.baseboard.titleText): \(u.len(b.length)) (\(b.pieces) × \(u.len(r.m.baseboard.piece)))") }
        return out
    }

    static func room(_ r: Room, _ u: Units) -> String {
        let res = Calc.compute(r)
        var text = ["\(r.name) — \(u.area(res.g.floor))"] + lines(r, res, u).map { "• \($0)" }
        if res.cost > 0 { text.append("\(String(localized: "Estimated cost")): \(u.money(res.cost))") }
        return text.joined(separator: "\n")
    }
}

struct ShoppingListView: View {
    @Environment(RoomStore.self) private var store
    @Environment(\.units) private var u

    private struct Item: Identifiable { let room: Room; let res: Calc.RoomResult; var id: UUID { room.id } }

    var body: some View {
        let items = store.rooms.map { Item(room: $0, res: Calc.compute($0)) }.filter { $0.res.g.floor > 0 || $0.res.g.wallNet > 0 }
        let total = items.reduce(0) { $0 + $1.res.cost }
        List {
            if items.isEmpty {
                ContentUnavailableView("Nothing to buy yet", systemImage: "cart", description: Text("Enter a room size and pick materials."))
            }
            ForEach(Material.allCases) { m in
                let rows = items.filter { has($0.res, m) }
                if !rows.isEmpty {
                    Section {
                        Text(head(m, rows)).font(.title3.weight(.bold)).foregroundStyle(m.color)
                        ForEach(rows) { it in
                            LabeledContent(it.room.name) { Text(itemText(m, it)).fontWeight(.semibold).monospacedDigit() }
                        }
                    } header: {
                        Label { Text(m.title) } icon: { Image(systemName: m.symbol).foregroundStyle(m.color) }
                    }
                }
            }
            if total > 0 {
                Section {
                    LabeledContent { Text(u.money(total)).font(.title2.weight(.bold)).monospacedDigit() } label: { Text("Estimated cost").font(.headline) }
                }
            }
        }
        .navigationTitle("Shopping list")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: shareText(items, total)) { Image(systemName: "square.and.arrow.up") }
            }
        }
    }

    private func has(_ res: Calc.RoomResult, _ m: Material) -> Bool {
        switch m {
        case .flooring: return res.flooring != nil
        case .tile: return res.tile != nil
        case .paint: return (res.paint?.litres ?? 0) > 0
        case .wallpaper: return res.wallpaper != nil
        case .baseboard: return res.baseboard != nil
        }
    }

    private func head(_ m: Material, _ rows: [Item]) -> String {
        switch m {
        case .flooring:
            let a = rows.reduce(0) { $0 + ($1.res.flooring?.area ?? 0) }, b = rows.reduce(0) { $0 + ($1.res.flooring?.boxes ?? 0) }
            return u.area(a) + (b > 0 ? " · \(b) \(String(localized: "boxes"))" : "")
        case .tile:
            let t = rows.reduce(0) { $0 + ($1.res.tile?.tiles ?? 0) }, g = rows.reduce(0) { $0 + ($1.res.tile?.groutKg ?? 0) }
            return "\(u.int(t)) \(String(localized: "tiles")) · \(String(localized: "grout")) \(u.num(g, 1)) kg"
        case .paint:
            let l = rows.reduce(0) { $0 + ($1.res.paint?.litres ?? 0) }
            return "\(u.volume(l)) · \(u.cansText(l))"
        case .wallpaper:
            return "\(rows.reduce(0) { $0 + ($1.res.wallpaper?.rolls ?? 0) }) \(String(localized: "rolls"))"
        case .baseboard:
            let l = rows.reduce(0) { $0 + ($1.res.baseboard?.length ?? 0) }, p = rows.reduce(0) { $0 + ($1.res.baseboard?.pieces ?? 0) }
            return "\(u.len(l)) · \(p) \(String(localized: "pieces"))"
        }
    }

    private func itemText(_ m: Material, _ it: Item) -> String {
        switch m {
        case .flooring: let f = it.res.flooring!; return f.boxes > 0 ? "\(f.boxes) \(String(localized: "boxes"))" : u.area(f.area)
        case .tile: return "\(u.int(it.res.tile!.tiles)) \(String(localized: "tiles"))"
        case .paint: return u.volume(it.res.paint!.litres)
        case .wallpaper: return "\(it.res.wallpaper!.rolls) \(String(localized: "rolls"))"
        case .baseboard: return "\(it.res.baseboard!.pieces) × \(u.len(it.room.m.baseboard.piece))"
        }
    }

    private func shareText(_ items: [Item], _ total: Double) -> String {
        var lines = ["\(String(localized: "Shopping list")) — Roomcalc"]
        for m in Material.allCases {
            let rows = items.filter { has($0.res, m) }
            if !rows.isEmpty { lines.append("\(m.titleText): \(head(m, rows))") }
        }
        if total > 0 { lines.append("\(String(localized: "Estimated cost")): \(u.money(total))") }
        for it in items { lines.append(""); lines.append(ShareText.room(it.room, u)) }
        return lines.joined(separator: "\n")
    }
}
