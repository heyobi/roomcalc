import Foundation

// Room geometry and material quantities. Everything here is metric (metres, m², litres); Units.swift converts for display.
// Plain value types and pure functions, covered by RoomcalcTests/CalcTests.swift.

enum OpeningKind: String, Codable, Hashable { case door, window }

struct Opening: Codable, Identifiable, Hashable {
    var id = UUID()
    var kind: OpeningKind
    var w: Double
    var h: Double
    var count: Int = 1
}

/// add: an alcove or the other leg of an L-shaped room (adds floor and 2 × depth of wall).
/// sub: cabinets, an island, a bathtub (floor only).
enum ExtraKind: String, Codable, Hashable { case add, sub }

struct Extra: Codable, Identifiable, Hashable {
    var id = UUID()
    var kind: ExtraKind
    var w: Double = 0
    var d: Double = 0
}

struct WallSize: Codable, Hashable { var w: Double; var h: Double }

struct ScanData: Codable, Hashable {
    var floorArea: Double
    var perimeter: Double
    var height: Double
    var walls: [WallSize]
}

struct FlooringSettings: Codable, Hashable { var on = true; var waste = 10.0; var box = 2.0; var price = 0.0 }
struct TileSettings: Codable, Hashable {
    var on = false; var waste = 10.0
    var tw = 0.6; var th = 0.6; var joint = 0.003; var depth = 0.01
    var box = 1.44; var price = 0.0
}
struct PaintSettings: Codable, Hashable { var on = true; var walls = true; var ceiling = false; var coats = 2; var coverage = 10.0; var price = 0.0 }
struct WallpaperSettings: Codable, Hashable { var on = false; var rollW = 0.53; var rollL = 10.05; var repeatLength = 0.0; var price = 0.0 }
struct BaseboardSettings: Codable, Hashable { var on = true; var piece = 2.4; var waste = 10.0; var price = 0.0 }

enum Material: String, CaseIterable, Identifiable, Codable {
    case flooring, tile, paint, wallpaper, baseboard
    var id: String { rawValue }
}

struct MaterialSettings: Codable, Hashable {
    var flooring = FlooringSettings()
    var tile = TileSettings()
    var paint = PaintSettings()
    var wallpaper = WallpaperSettings()
    var baseboard = BaseboardSettings()

    static let ft2 = 0.09290304
    static let gallon = 3.785411784

    /// Typical store sizes: 2 m² laminate boxes or 20 ft²; 60 × 60 cm or 12 × 24 in tiles; 10 m²/L or 400 ft²/gal paint;
    /// 0.53 × 10.05 m European rolls or 20.5 in × 33 ft US double rolls; 2.4 m or 8 ft baseboard.
    static func defaults(imperial: Bool) -> MaterialSettings {
        var m = MaterialSettings()
        if imperial {
            m.flooring.box = 20 * ft2
            m.tile.tw = 0.3048; m.tile.th = 0.6096; m.tile.joint = 0.003175; m.tile.box = 16 * ft2
            m.paint.coverage = 400 * ft2 / gallon
            m.wallpaper.rollW = 0.5207; m.wallpaper.rollL = 10.0584
            m.baseboard.piece = 2.4384
        }
        return m
    }

    func isOn(_ m: Material) -> Bool {
        switch m {
        case .flooring: return flooring.on
        case .tile: return tile.on
        case .paint: return paint.on
        case .wallpaper: return wallpaper.on
        case .baseboard: return baseboard.on
        }
    }

    mutating func set(_ m: Material, on: Bool) {
        switch m {
        case .flooring: flooring.on = on
        case .tile: tile.on = on
        case .paint: paint.on = on
        case .wallpaper: wallpaper.on = on
        case .baseboard: baseboard.on = on
        }
    }
}

struct Room: Codable, Identifiable, Hashable {
    var id = UUID()
    var name: String
    var updated = Date()
    var length = 0.0
    var width = 0.0
    var height = 2.5
    var extras: [Extra] = []
    var openings: [Opening] = []
    var scan: ScanData?
    var m = MaterialSettings()
}

struct Geometry: Equatable {
    var floor: Double
    var perimeter: Double
    var height: Double
    var wallGross: Double
    var openingsArea: Double
    var wallNet: Double
    var ceiling: Double
    var doorWidth: Double
}

private func up(_ x: Double) -> Int { x > 0 ? Int((x - 1e-9).rounded(.up)) : 0 }

enum Calc {
    static func geometry(_ r: Room) -> Geometry {
        let openingsArea = r.openings.reduce(0) { $0 + $1.w * $1.h * Double($1.count) }
        let doorWidth = r.openings.filter { $0.kind == .door }.reduce(0) { $0 + $1.w * Double($1.count) }
        var floor: Double, perimeter: Double, height: Double, wallGross: Double, ceiling: Double
        if let s = r.scan {
            floor = s.floorArea
            perimeter = s.perimeter
            height = r.height > 0 ? r.height : s.height
            wallGross = s.walls.isEmpty ? perimeter * height : s.walls.reduce(0) { $0 + $1.w * (r.height > 0 ? r.height : $1.h) }
            ceiling = s.floorArea
        } else {
            height = r.height
            floor = r.length * r.width
            perimeter = r.length > 0 && r.width > 0 ? 2 * (r.length + r.width) : 0
            ceiling = floor
            for e in r.extras {
                if e.kind == .add { floor += e.w * e.d; ceiling += e.w * e.d; perimeter += 2 * e.d } else { floor -= e.w * e.d }
            }
            floor = max(0, floor)
            wallGross = perimeter * height
        }
        return Geometry(floor: floor, perimeter: perimeter, height: height, wallGross: wallGross, openingsArea: openingsArea,
                        wallNet: max(0, wallGross - openingsArea), ceiling: max(0, ceiling), doorWidth: doorWidth)
    }

    struct FlooringResult: Equatable { var area: Double; var boxes: Int; var cost: Double }
    static func flooring(_ g: Geometry, _ s: FlooringSettings) -> FlooringResult {
        let area = g.floor * (1 + s.waste / 100)
        let boxes = s.box > 0 ? up(area / s.box) : 0
        return FlooringResult(area: area, boxes: boxes, cost: s.price * (boxes > 0 && s.box > 0 ? Double(boxes) * s.box : area))
    }

    struct TileResult: Equatable { var area: Double; var tiles: Int; var boxes: Int; var groutKg: Double; var cost: Double }
    static func tile(_ g: Geometry, _ s: TileSettings) -> TileResult {
        let area = g.floor * (1 + s.waste / 100)
        let cell = (s.tw + s.joint) * (s.th + s.joint)
        let tiles = cell > 0 ? up(area / cell) : 0
        let boxes = s.box > 0 ? up(area / s.box) : 0
        // Grout (kg/m²) = (A + B) / (A × B) × thickness × joint × 1.6, with A, B, thickness and joint in mm. Uses the net floor.
        let a = s.tw * 1000, b = s.th * 1000
        let grout = a > 0 && b > 0 ? ((a + b) / (a * b)) * s.depth * 1000 * s.joint * 1000 * 1.6 * g.floor : 0
        return TileResult(area: area, tiles: tiles, boxes: boxes, groutKg: grout, cost: s.price * (boxes > 0 && s.box > 0 ? Double(boxes) * s.box : area))
    }

    struct PaintResult: Equatable { var area: Double; var litres: Double; var cost: Double }
    static func paint(_ g: Geometry, _ s: PaintSettings) -> PaintResult {
        let area = (s.walls ? g.wallNet : 0) + (s.ceiling ? g.ceiling : 0)
        let litres = s.coverage > 0 ? area * Double(s.coats) / s.coverage : 0
        return PaintResult(area: area, litres: litres, cost: s.price * litres)
    }

    struct CanCount: Equatable { var size: Double; var n: Int }
    /// Cans that cover the need: few cans, little left over. Score = leftover share + 0.12 per can.
    static func cans(_ need: Double, sizes: [Double]) -> [CanCount] {
        guard need > 0, !sizes.isEmpty else { return [] }
        let sorted = sizes.sorted(by: >)
        let maxBig = Int((need / sorted[0]).rounded(.up))
        var best: (score: Double, combo: [Int])?
        var combo = Array(repeating: 0, count: sorted.count)
        func rec(_ i: Int, _ total: Double) {
            if total >= need - 1e-9 {
                let count = combo.reduce(0, +)
                let score = (total - need) / need + 0.12 * Double(count)
                if best == nil || score < best!.score - 1e-9 { best = (score, combo) }
                return
            }
            if i >= sorted.count { return }
            let lim = i == 0 ? maxBig : 4
            for n in 0...lim {
                combo[i] = n
                rec(i + 1, total + Double(n) * sorted[i])
            }
            combo[i] = 0
        }
        rec(0, 0)
        guard let b = best else { return [] }
        return zip(sorted, b.combo).filter { $0.1 > 0 }.map { CanCount(size: $0.0, n: $0.1) }
    }

    struct WallpaperResult: Equatable { var strips: Int; var stripLength: Double; var perRoll: Int; var rolls: Int; var cost: Double }
    static func wallpaper(_ g: Geometry, _ s: WallpaperSettings) -> WallpaperResult {
        let run = max(0, g.perimeter - g.doorWidth)
        let strips = s.rollW > 0 ? up(run / s.rollW) : 0
        // Each strip: wall height + 10 cm for trimming, rounded up to whole pattern repeats.
        var strip = g.height + 0.1
        if s.repeatLength > 0 { strip = (strip / s.repeatLength - 1e-9).rounded(.up) * s.repeatLength }
        let perRoll = strip > 0 ? Int((s.rollL / strip + 1e-9).rounded(.down)) : 0
        let rolls = perRoll > 0 ? up(Double(strips) / Double(perRoll)) : 0
        return WallpaperResult(strips: strips, stripLength: strip, perRoll: perRoll, rolls: rolls, cost: s.price * Double(rolls))
    }

    struct BaseboardResult: Equatable { var length: Double; var pieces: Int; var cost: Double }
    static func baseboard(_ g: Geometry, _ s: BaseboardSettings) -> BaseboardResult {
        let length = max(0, g.perimeter - g.doorWidth) * (1 + s.waste / 100)
        let pieces = s.piece > 0 ? up(length / s.piece) : 0
        return BaseboardResult(length: length, pieces: pieces, cost: s.price * Double(pieces))
    }

    struct RoomResult {
        var g: Geometry
        var flooring: FlooringResult?
        var tile: TileResult?
        var paint: PaintResult?
        var wallpaper: WallpaperResult?
        var baseboard: BaseboardResult?
        var cost: Double {
            (flooring?.cost ?? 0) + (tile?.cost ?? 0) + (paint?.cost ?? 0) + (wallpaper?.cost ?? 0) + (baseboard?.cost ?? 0)
        }
    }

    static func compute(_ r: Room) -> RoomResult {
        let g = geometry(r)
        return RoomResult(
            g: g,
            flooring: r.m.flooring.on ? flooring(g, r.m.flooring) : nil,
            tile: r.m.tile.on ? tile(g, r.m.tile) : nil,
            paint: r.m.paint.on ? paint(g, r.m.paint) : nil,
            wallpaper: r.m.wallpaper.on ? wallpaper(g, r.m.wallpaper) : nil,
            baseboard: r.m.baseboard.on ? baseboard(g, r.m.baseboard) : nil)
    }

    /// The rectangle with a given area and perimeter (used when switching a scanned room to typed sizes).
    static func rectangle(area: Double, perimeter: Double) -> (length: Double, width: Double) {
        let half = perimeter / 2
        let disc = max(0, half * half - 4 * area)
        let l = (half + disc.squareRoot()) / 2
        return ((l * 100).rounded() / 100, ((half - l) * 100).rounded() / 100)
    }
}
