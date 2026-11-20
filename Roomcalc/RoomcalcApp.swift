import SwiftUI

@main
struct RoomcalcApp: App {
    @State private var store = RoomStore(demo: ProcessInfo.processInfo.arguments.contains("-demo"))
    @AppStorage("units.imperial") private var imperial = Units.defaultImperial
    @AppStorage("appearance") private var appearance = "system"

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environment(store)
                .environment(\.units, Units(imperial: imperial))
                .preferredColorScheme(appearance == "light" ? .light : appearance == "dark" ? .dark : nil)
                .tint(.accentColor)
        }
    }
}

private struct UnitsKey: EnvironmentKey { static let defaultValue = Units(imperial: Units.defaultImperial) }
extension EnvironmentValues {
    var units: Units {
        get { self[UnitsKey.self] }
        set { self[UnitsKey.self] = newValue }
    }
}

extension Material {
    var title: LocalizedStringKey {
        switch self {
        case .flooring: return "Flooring"
        case .tile: return "Tile"
        case .paint: return "Paint"
        case .wallpaper: return "Wallpaper"
        case .baseboard: return "Baseboard"
        }
    }
    var titleText: String {
        switch self {
        case .flooring: return String(localized: "Flooring")
        case .tile: return String(localized: "Tile")
        case .paint: return String(localized: "Paint")
        case .wallpaper: return String(localized: "Wallpaper")
        case .baseboard: return String(localized: "Baseboard")
        }
    }
    var symbol: String {
        switch self {
        case .flooring: return "square.split.diagonal.2x2"
        case .tile: return "square.grid.3x3"
        case .paint: return "paintbrush.fill"
        case .wallpaper: return "scroll"
        case .baseboard: return "ruler"
        }
    }
    var color: Color {
        switch self {
        case .flooring: return Color(red: 0.69, green: 0.42, blue: 0.11)
        case .tile: return Color(red: 0.04, green: 0.54, blue: 0.60)
        case .paint: return Color(red: 0.44, green: 0.31, blue: 0.88)
        case .wallpaper: return Color(red: 0.78, green: 0.24, blue: 0.47)
        case .baseboard: return Color(red: 0.40, green: 0.45, blue: 0.51)
        }
    }
}
