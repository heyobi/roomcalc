import Foundation
import Observation

/// Rooms live in one JSON file in Application Support. Every change is written right away (the file is tiny).
@Observable
final class RoomStore {
    var rooms: [Room] = [] {
        didSet { save() }
    }

    private let url: URL

    init(demo: Bool = false) {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        url = dir.appendingPathComponent(demo ? "rooms-demo.json" : "rooms.json")
        if demo {
            rooms = RoomStore.demoRooms()
        } else if let data = try? Data(contentsOf: url), let list = try? JSONDecoder().decode([Room].self, from: data) {
            rooms = list.sorted { $0.updated > $1.updated }
        }
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(rooms) else { return }
        try? data.write(to: url, options: .atomic)
    }

    func newRoom(imperial: Bool) -> Room {
        let n = rooms.count + 1
        var r = Room(name: String(localized: "Room") + " \(n)")
        r.height = imperial ? 8 * Units.ft : 2.5
        r.m = MaterialSettings.defaults(imperial: imperial)
        return r
    }

    func add(_ r: Room) { rooms.insert(r, at: 0) }

    func update(_ r: Room) {
        guard let i = rooms.firstIndex(where: { $0.id == r.id }) else { return }
        var r = r
        r.updated = Date()
        rooms[i] = r
    }

    func delete(_ id: UUID) { rooms.removeAll { $0.id == id } }

    /// When the unit system changes, material sizes still at the old defaults follow the new system.
    func switchDefaults(toImperial imp: Bool) {
        let old = MaterialSettings.defaults(imperial: !imp), new = MaterialSettings.defaults(imperial: imp)
        rooms = rooms.map { r in
            var r = r
            if r.m.flooring.box == old.flooring.box { r.m.flooring.box = new.flooring.box }
            if r.m.tile.tw == old.tile.tw && r.m.tile.th == old.tile.th { r.m.tile.tw = new.tile.tw; r.m.tile.th = new.tile.th }
            if r.m.tile.joint == old.tile.joint { r.m.tile.joint = new.tile.joint }
            if r.m.tile.box == old.tile.box { r.m.tile.box = new.tile.box }
            if r.m.paint.coverage == old.paint.coverage { r.m.paint.coverage = new.paint.coverage }
            if r.m.wallpaper.rollW == old.wallpaper.rollW { r.m.wallpaper.rollW = new.wallpaper.rollW }
            if r.m.wallpaper.rollL == old.wallpaper.rollL { r.m.wallpaper.rollL = new.wallpaper.rollL }
            if r.m.baseboard.piece == old.baseboard.piece { r.m.baseboard.piece = new.baseboard.piece }
            return r
        }
    }

    /// Sample rooms for App Store screenshots (launch argument -demo).
    static func demoRooms() -> [Room] {
        let imp = Units.defaultImperial
        var living = Room(name: String(localized: "Living room"), length: imp ? 18 * Units.ft : 5.6, width: imp ? 14 * Units.ft : 4.2, height: imp ? 8 * Units.ft : 2.6)
        living.m = MaterialSettings.defaults(imperial: imp)
        living.m.flooring.price = imp ? 3.49 / Units.ft2 : 24.9
        living.m.paint.price = imp ? 38 / Units.gallon : 9.5
        living.m.baseboard.price = imp ? 12 : 7.5
        living.openings = [Opening(kind: .door, w: imp ? 32 * Units.inch : 0.8, h: imp ? 80 * Units.inch : 2.0),
                           Opening(kind: .window, w: imp ? 48 * Units.inch : 1.4, h: imp ? 48 * Units.inch : 1.3, count: 2)]
        var bath = Room(name: String(localized: "Bathroom"), length: imp ? 8 * Units.ft : 2.4, width: imp ? 6 * Units.ft : 1.9, height: imp ? 8 * Units.ft : 2.5)
        bath.m = MaterialSettings.defaults(imperial: imp)
        bath.m.flooring.on = false; bath.m.baseboard.on = false; bath.m.tile.on = true
        bath.m.tile.price = imp ? 4.99 / Units.ft2 : 32
        bath.extras = [Extra(kind: .sub, w: imp ? 5 * Units.ft : 1.7, d: imp ? 2.5 * Units.ft : 0.75)]
        bath.openings = [Opening(kind: .door, w: imp ? 30 * Units.inch : 0.75, h: imp ? 80 * Units.inch : 2.0)]
        var bed = Room(name: String(localized: "Bedroom"), height: 2.5)
        bed.scan = ScanData(floorArea: imp ? 168 * Units.ft2 : 14.3, perimeter: imp ? 52 * Units.ft : 15.2, height: imp ? 8 * Units.ft : 2.5,
                            walls: [WallSize(w: 4.2, h: 2.5), WallSize(w: 3.4, h: 2.5), WallSize(w: 4.2, h: 2.5), WallSize(w: 3.4, h: 2.5)])
        bed.height = bed.scan!.height
        bed.m = MaterialSettings.defaults(imperial: imp)
        bed.m.wallpaper.on = true
        bed.openings = [Opening(kind: .door, w: 0.82, h: 2.03), Opening(kind: .window, w: 1.4, h: 1.3)]
        return [living, bed, bath]
    }
}
