import SwiftUI
import RoomPlan

enum Route: Hashable {
    case room(UUID)
    case list
}

struct HomeView: View {
    @Environment(RoomStore.self) private var store
    @Environment(\.units) private var u
    @State private var path: [Route] = []
    @State private var showSettings = false
    @State private var scanning = false
    private let canScan = RoomCaptureSession.isSupported

    var body: some View {
        NavigationStack(path: $path) {
            List {
                Section { hero }
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 8, trailing: 0))

                if !store.rooms.isEmpty {
                    Section {
                        NavigationLink(value: Route.list) {
                            HStack(spacing: 14) {
                                Image(systemName: "list.bullet.clipboard.fill")
                                    .font(.title2).foregroundStyle(.white)
                                    .frame(width: 44, height: 44)
                                    .background(Color.accentColor.gradient, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Shopping list").font(.headline)
                                    Text(listSubtitle).font(.subheadline).foregroundStyle(.secondary)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                        .accessibilityIdentifier("shoppingList")
                    }
                }

                Section {
                    if store.rooms.isEmpty {
                        ContentUnavailableView("No rooms yet", systemImage: "square.dashed",
                                               description: Text("Add your first room to see what to buy."))
                    }
                    ForEach(Array(store.rooms.enumerated()), id: \.element.id) { i, r in
                        NavigationLink(value: Route.room(r.id)) { RoomRow(room: r) }
                            .accessibilityIdentifier("room-\(i)")
                    }
                    .onDelete { idx in
                        let ids = idx.map { store.rooms[$0].id }
                        ids.forEach(store.delete)
                    }
                } header: {
                    Text("Rooms")
                }
            }
            .navigationTitle("Roomcalc")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: { Image(systemName: "gearshape") }
                        .accessibilityLabel(Text("Settings"))
                }
            }
            .navigationDestination(for: Route.self) { route in
                switch route {
                case .room(let id):
                    if let r = store.rooms.first(where: { $0.id == id }) { RoomView(room: r) }
                case .list:
                    ShoppingListView()
                }
            }
            .sheet(isPresented: $showSettings) { SettingsView() }
            .fullScreenCover(isPresented: $scanning) {
                ScanView { result in
                    scanning = false
                    guard let result else { return }
                    var r = store.newRoom(imperial: u.imperial)
                    r.scan = result.scan
                    r.height = result.scan.height
                    r.openings = result.openings
                    store.add(r)
                    path.append(.room(r.id))
                }
                .ignoresSafeArea()
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("How much do I need?")
                .font(.system(.largeTitle, design: .rounded).weight(.bold))
                .fixedSize(horizontal: false, vertical: true)
            Text("Measure a room once. Get flooring, tile, paint, wallpaper and baseboard amounts in seconds.")
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            VStack(spacing: 10) {
                if canScan {
                    Button { scanning = true } label: {
                        Label("Scan a room", systemImage: "camera.metering.matrix").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .accessibilityIdentifier("scan")
                }
                Button {
                    let r = store.newRoom(imperial: u.imperial)
                    store.add(r)
                    path.append(.room(r.id))
                } label: {
                    Label("Enter size", systemImage: "ruler").frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(canScan ? .accentColor : .accentColor)
                .accessibilityIdentifier("enterSize")
            }
            .controlSize(.large)
            .padding(.top, 4)
            if !canScan {
                Text("Room scanning works on iPhone Pro models with LiDAR. Typing the size works on every iPhone.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 4)
    }

    private var listSubtitle: String {
        let total = store.rooms.reduce(0) { $0 + Calc.compute($1).cost }
        let rooms = String(localized: "\(store.rooms.count) rooms")
        return total > 0 ? "\(rooms) · \(u.money(total))" : rooms
    }
}

struct RoomRow: View {
    let room: Room
    @Environment(\.units) private var u

    var body: some View {
        let res = Calc.compute(room)
        HStack(spacing: 12) {
            Image(systemName: room.scan != nil ? "camera.metering.matrix" : "ruler")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(room.scan != nil ? Color.accentColor : .secondary)
                .frame(width: 40, height: 40)
                .background(room.scan != nil ? Color.accentColor.opacity(0.14) : Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 11, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(room.name).font(.headline).lineLimit(1)
                Text(subtitle(res)).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 4)
            if res.cost > 0 { Text(u.money(res.cost)).font(.subheadline.weight(.semibold)).monospacedDigit() }
        }
        .padding(.vertical, 2)
    }

    private func subtitle(_ res: Calc.RoomResult) -> String {
        guard res.g.floor > 0 else { return String(localized: "Size not entered yet") }
        let mats = Material.allCases.filter { room.m.isOn($0) }.map(\.titleText).joined(separator: ", ")
        return "\(u.area(res.g.floor)) · \(mats.isEmpty ? String(localized: "No materials") : mats)"
    }
}
