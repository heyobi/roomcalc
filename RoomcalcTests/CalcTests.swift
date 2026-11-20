import XCTest
@testable import Roomcalc

final class CalcTests: XCTestCase {
    private func room(_ edit: (inout Room) -> Void = { _ in }) -> Room {
        var r = Room(name: "Test", length: 5, width: 4, height: 2.5)
        edit(&r)
        return r
    }

    func testRectangle() {
        let g = Calc.geometry(room())
        XCTAssertEqual(g.floor, 20, accuracy: 1e-9)
        XCTAssertEqual(g.perimeter, 18, accuracy: 1e-9)
        XCTAssertEqual(g.wallGross, 45, accuracy: 1e-9)
        XCTAssertEqual(g.ceiling, 20, accuracy: 1e-9)
    }

    func testLShapeAndExcludedArea() {
        let g = Calc.geometry(room { $0.extras = [Extra(kind: .add, w: 2, d: 1.5), Extra(kind: .sub, w: 1, d: 0.6)] })
        XCTAssertEqual(g.floor, 20 + 3 - 0.6, accuracy: 1e-9)
        XCTAssertEqual(g.perimeter, 21, accuracy: 1e-9)
        XCTAssertEqual(g.ceiling, 23, accuracy: 1e-9)
    }

    func testDoorsAndWindows() {
        let g = Calc.geometry(room { $0.openings = [Opening(kind: .door, w: 0.8, h: 2), Opening(kind: .window, w: 1.2, h: 1.2, count: 2)] })
        XCTAssertEqual(g.openingsArea, 1.6 + 2.88, accuracy: 1e-9)
        XCTAssertEqual(g.wallNet, 45 - 4.48, accuracy: 1e-9)
        XCTAssertEqual(g.doorWidth, 0.8, accuracy: 1e-9)
    }

    func testScannedRoom() {
        let walls = [WallSize(w: 4, h: 2.4), WallSize(w: 3.5, h: 2.4), WallSize(w: 4, h: 2.4), WallSize(w: 3.5, h: 2.4)]
        let g = Calc.geometry(room { $0.height = 0; $0.scan = ScanData(floorArea: 13.2, perimeter: 15, height: 2.4, walls: walls) })
        XCTAssertEqual(g.floor, 13.2, accuracy: 1e-9)
        XCTAssertEqual(g.height, 2.4, accuracy: 1e-9)
        XCTAssertEqual(g.wallGross, 36, accuracy: 1e-9)
    }

    func testFlooring() {
        let r = Calc.flooring(Calc.geometry(room()), FlooringSettings(on: true, waste: 10, box: 2, price: 10))
        XCTAssertEqual(r.area, 22, accuracy: 1e-9)
        XCTAssertEqual(r.boxes, 11)
        XCTAssertEqual(r.cost, 220, accuracy: 1e-9)
    }

    func testTileAndGrout() {
        let r = Calc.tile(Calc.geometry(room()), TileSettings())
        XCTAssertEqual(r.tiles, Int((22 / (0.603 * 0.603)).rounded(.up)))
        XCTAssertEqual(r.boxes, 16)
        // (600+600)/(600·600) × 10 × 3 × 1.6 = 0.16 kg/m²
        XCTAssertEqual(r.groutKg, 3.2, accuracy: 1e-9)
    }

    func testPaint() {
        let g = Calc.geometry(room())
        XCTAssertEqual(Calc.paint(g, PaintSettings()).litres, 9, accuracy: 1e-9)
        var s = PaintSettings(); s.ceiling = true
        XCTAssertEqual(Calc.paint(g, s).litres, 13, accuracy: 1e-9)
    }

    func testWallpaper() {
        let g = Calc.geometry(room())
        let r = Calc.wallpaper(g, WallpaperSettings())
        XCTAssertEqual(r.strips, 34)
        XCTAssertEqual(r.perRoll, 3)
        XCTAssertEqual(r.rolls, 12)
        var s = WallpaperSettings(); s.repeatLength = 0.64
        let p = Calc.wallpaper(g, s)
        XCTAssertEqual(p.stripLength, 3.2, accuracy: 1e-9)
        XCTAssertEqual(p.perRoll, 3)
    }

    func testBaseboard() {
        let g = Calc.geometry(room { $0.openings = [Opening(kind: .door, w: 0.9, h: 2, count: 2)] })
        let r = Calc.baseboard(g, BaseboardSettings(on: true, piece: 2.4, waste: 10, price: 5))
        XCTAssertEqual(r.length, 16.2 * 1.1, accuracy: 1e-9)
        XCTAssertEqual(r.pieces, 8)
        XCTAssertEqual(r.cost, 40, accuracy: 1e-9)
    }

    func testComputeOnlyEnabled() {
        let r = Calc.compute(room())
        XCTAssertNotNil(r.flooring); XCTAssertNotNil(r.paint); XCTAssertNotNil(r.baseboard)
        XCTAssertNil(r.tile); XCTAssertNil(r.wallpaper)
    }

    func testCans() {
        let s = [10.0, 5, 2.5, 1]
        XCTAssertEqual(Calc.cans(9, sizes: s), [.init(size: 10, n: 1)])
        XCTAssertEqual(Calc.cans(6, sizes: s), [.init(size: 5, n: 1), .init(size: 1, n: 1)])
        XCTAssertEqual(Calc.cans(17, sizes: s), [.init(size: 10, n: 1), .init(size: 5, n: 1), .init(size: 2.5, n: 1)])
        XCTAssertEqual(Calc.cans(0, sizes: s), [])
    }

    func testRectangleFromScan() {
        let r = Calc.rectangle(area: 20, perimeter: 18)
        XCTAssertEqual(r.length, 5, accuracy: 1e-9)
        XCTAssertEqual(r.width, 4, accuracy: 1e-9)
    }

    func testUnitsRoundTrip() {
        let u = Units(imperial: true)
        XCTAssertEqual(u.len(16 * 0.3048 + 6 * 0.0254), "16′ 6″")
        XCTAssertEqual(u.area(20), "215 ft²")
        let m = Units(imperial: false)
        XCTAssertEqual(m.area(20).replacingOccurrences(of: ",", with: "."), "20 m²")
    }
}
