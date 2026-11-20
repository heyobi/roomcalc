import Foundation

/// Metric / imperial display. Values are stored in metres; only what the user sees and types changes.
struct Units {
    var imperial: Bool
    var locale: Locale = .current

    static let ft = 0.3048, inch = 0.0254, ft2 = 0.09290304, gallon = 3.785411784

    /// US-style locales start in feet and inches.
    static var defaultImperial: Bool { Locale.current.measurementSystem == .us }

    func num(_ x: Double, _ digits: Int = 1) -> String {
        x.formatted(.number.precision(.fractionLength(0...digits)).locale(locale))
    }
    func int(_ x: Int) -> String { x.formatted(.number.locale(locale)) }

    /// Room-size lengths: 4.25 m · 13′ 11″
    func len(_ m: Double) -> String {
        if !imperial { return "\(num(m, m >= 10 ? 1 : 2)) m" }
        var inches = Int((m / Units.inch).rounded())
        let feet = inches / 12
        inches -= feet * 12
        return inches > 0 ? "\(feet)′ \(inches)″" : "\(feet)′"
    }
    /// Small sizes (doors, tiles, rolls): 80 cm · 32″
    func small(_ m: Double) -> String { imperial ? "\(num(m / Units.inch, 1))″" : "\(num(m * 100, 1)) cm" }
    func area(_ m2: Double) -> String { imperial ? "\(num(m2 / Units.ft2, 0)) ft²" : "\(num(m2, 1)) m²" }
    func volume(_ l: Double) -> String { imperial ? "\(num(l / Units.gallon, 1)) gal" : "\(num(l, 1)) L" }

    var lenUnit: String { imperial ? "ft" : "m" }
    var smallUnit: String { imperial ? "in" : "cm" }
    var mmUnit: String { imperial ? "in" : "mm" }
    var areaUnit: String { imperial ? "ft²" : "m²" }
    var volUnit: String { imperial ? "gal" : "L" }
    var coverageUnit: String { imperial ? "ft²/gal" : "m²/L" }

    // Factors from the stored metric value to the number shown in a field.
    var lenFactor: Double { imperial ? Units.ft : 1 }
    var smallFactor: Double { imperial ? Units.inch : 0.01 }
    var mmFactor: Double { imperial ? Units.inch : 0.001 }
    var areaFactor: Double { imperial ? Units.ft2 : 1 }
    var volFactor: Double { imperial ? Units.gallon : 1 }
    var coverageFactor: Double { imperial ? Units.ft2 / Units.gallon : 1 }

    /// Paint can sizes in litres.
    var canSizes: [Double] { imperial ? [5 * Units.gallon, Units.gallon, Units.gallon / 4] : [10, 5, 2.5, 1] }
    func canLabel(_ l: Double) -> String {
        if !imperial { return "\(num(l, 1)) L" }
        let g = l / Units.gallon
        return g >= 4.9 ? "5 gal" : g >= 0.99 ? "1 gal" : "1 qt"
    }
    func cansText(_ litres: Double) -> String {
        Calc.cans(litres, sizes: canSizes).map { "\($0.n) × \(canLabel($0.size))" }.joined(separator: " + ")
    }

    func money(_ x: Double) -> String {
        let code = locale.currency?.identifier ?? "USD"
        return x.formatted(.currency(code: code).precision(.fractionLength(x >= 100 ? 0 : 2)).locale(locale))
    }
    var currencySymbol: String { locale.currencySymbol ?? "$" }
}
