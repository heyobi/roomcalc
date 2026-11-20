import SwiftUI
import RoomPlan

struct RoomView: View {
    @Environment(RoomStore.self) private var store
    @Environment(\.units) private var u
    @Environment(\.dismiss) private var dismiss
    @State private var room: Room
    @State private var renaming = false
    @State private var newName = ""
    @State private var confirmDelete = false
    @State private var confirmManual = false
    @State private var scanning = false

    init(room: Room) { _room = State(initialValue: room) }

    var body: some View {
        let res = Calc.compute(room)
        Form {
            Section {
                HStack(spacing: 8) {
                    Stat(label: "Floor", value: res.g.floor > 0 ? u.area(res.g.floor) : "—")
                    Stat(label: "Walls", value: res.g.wallNet > 0 ? u.area(res.g.wallNet) : "—")
                    Stat(label: "Perimeter", value: res.g.perimeter > 0 ? u.len(res.g.perimeter) : "—")
                }
                .padding(.vertical, 4)
                .accessibilityIdentifier("stats")
            }

            sizeSection
            openingsSection

            Section {
                ForEach(Material.allCases) { m in
                    Toggle(isOn: Binding(get: { room.m.isOn(m) }, set: { room.m.set(m, on: $0) })) {
                        Label { Text(m.title) } icon: { MaterialIcon(symbol: m.symbol, color: m.color) }
                    }
                    .tint(m.color)
                    .accessibilityIdentifier("toggle-\(m.rawValue)")
                }
            } header: { Text("What are you buying?") }

            ForEach(Material.allCases.filter { room.m.isOn($0) }) { m in
                materialSection(m, res)
            }

            if res.cost > 0 {
                Section {
                    LabeledContent {
                        Text(u.money(res.cost)).font(.title2.weight(.bold)).monospacedDigit()
                    } label: { Text("Estimated cost").font(.headline) }
                }
            }

            Section {} footer: {
                Text("Amounts include the waste allowance you set. Check sizes and coverage on the product label before you buy.")
            }
        }
        .navigationTitle(room.name)
        .navigationBarTitleDisplayMode(.large)
        .scrollDismissesKeyboard(.interactively)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: ShareText.room(room, u)) { Image(systemName: "square.and.arrow.up") }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { newName = room.name; renaming = true } label: { Label("Rename", systemImage: "pencil") }
                    Button {
                        var c = room
                        c.id = UUID(); c.name = room.name + " 2"; c.updated = Date()
                        store.add(c)
                        dismiss()
                    } label: { Label("Duplicate", systemImage: "plus.square.on.square") }
                    Button(role: .destructive) { confirmDelete = true } label: { Label("Delete room", systemImage: "trash") }
                } label: { Image(systemName: "ellipsis.circle") }
            }
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") { dismissKeyboard() }.fontWeight(.semibold)
            }
        }
        .onChange(of: room) { _, r in store.update(r) }
        .alert("Rename room", isPresented: $renaming) {
            TextField("Name", text: $newName)
            Button("Cancel", role: .cancel) {}
            Button("Rename") { if !newName.trimmingCharacters(in: .whitespaces).isEmpty { room.name = newName } }
        }
        .confirmationDialog("Delete this room?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete room", role: .destructive) { store.delete(room.id); dismiss() }
        } message: { Text("This room and its measurements are removed.") }
        .confirmationDialog("Type the size instead?", isPresented: $confirmManual, titleVisibility: .visible) {
            Button("Type size") {
                if let s = room.scan {
                    let rect = Calc.rectangle(area: s.floorArea, perimeter: s.perimeter)
                    room.length = rect.length; room.width = rect.width
                }
                room.scan = nil
            }
        } message: { Text("The scan is replaced by length and width you type. Doors and windows are kept.") }
        .fullScreenCover(isPresented: $scanning) {
            ScanView { result in
                scanning = false
                guard let result else { return }
                room.scan = result.scan
                room.height = result.scan.height
                if room.openings.isEmpty { room.openings = result.openings }
            }
            .ignoresSafeArea()
        }
    }

    // MARK: size

    @ViewBuilder private var sizeSection: some View {
        if let s = room.scan {
            Section {
                Line(label: "Floor area", value: u.area(s.floorArea))
                Line(label: "Wall length", value: u.len(s.perimeter))
                Line(label: "Walls found", value: "\(s.walls.count)")
                LengthField(label: "Ceiling height", value: $room.height)
                Button("Type the size instead") { confirmManual = true }
            } header: {
                Label("Scanned with LiDAR", systemImage: "camera.metering.matrix")
            }
        } else {
            Section {
                HStack(spacing: 10) {
                    LengthField(label: "Length", value: $room.length)
                    LengthField(label: "Width", value: $room.width)
                }
                LengthField(label: "Ceiling height", value: $room.height)
                    .frame(maxWidth: u.imperial ? .infinity : 180, alignment: .leading)
                if RoomCaptureSession.isSupported {
                    Button { scanning = true } label: { Label("Scan this room instead", systemImage: "camera.metering.matrix") }
                }
            } header: { Text("Room size") }

            Section {
                ForEach($room.extras) { $e in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(e.kind == .add ? "Extra part (L-shape, alcove)" : "Not covered (cabinets, island, tub)")
                            .font(.subheadline.weight(.semibold))
                        HStack(spacing: 10) {
                            LengthField(label: "Width", value: $e.w)
                            LengthField(label: "Depth", value: $e.d)
                        }
                    }
                    .padding(.vertical, 4)
                }
                .onDelete { room.extras.remove(atOffsets: $0) }
                Button { room.extras.append(Extra(kind: .add)) } label: { Label("Extra part", systemImage: "plus.square.dashed") }
                Button { room.extras.append(Extra(kind: .sub)) } label: { Label("Not covered", systemImage: "minus.square") }
            } footer: {
                Text("Extra part: the other leg of an L-shaped room or an alcove. Not covered: floor you won't cover, like kitchen cabinets.")
            }
        }
    }

    // MARK: openings

    private var openingsSection: some View {
        Section {
            ForEach($room.openings) { $o in
                HStack(alignment: .bottom, spacing: 8) {
                    Image(systemName: o.kind == .door ? "door.left.hand.open" : "window.vertical.closed")
                        .foregroundStyle(.secondary).frame(width: 24).padding(.bottom, 10)
                    NumberField(label: "Width", value: $o.w, factor: u.smallFactor, unit: u.smallUnit, digits: 1)
                    NumberField(label: "Height", value: $o.h, factor: u.smallFactor, unit: u.smallUnit, digits: 1)
                    Stepper(value: $o.count, in: 1...20) { Text("\(o.count)").monospacedDigit().fontWeight(.semibold) }
                        .fixedSize()
                }
                .padding(.vertical, 2)
            }
            .onDelete { room.openings.remove(atOffsets: $0) }
            HStack {
                Button {
                    room.openings.append(Opening(kind: .door, w: u.imperial ? 32 * Units.inch : 0.8, h: u.imperial ? 80 * Units.inch : 2.0))
                } label: { Label("Door", systemImage: "plus") }
                .buttonStyle(.bordered)
                Button {
                    room.openings.append(Opening(kind: .window, w: u.imperial ? 36 * Units.inch : 1.2, h: u.imperial ? 48 * Units.inch : 1.2))
                } label: { Label("Window", systemImage: "plus") }
                .buttonStyle(.bordered)
            }
        } header: {
            Text("Doors and windows")
        } footer: {
            Text("Taken off the wall area. Doors are also left out of baseboard and wallpaper.")
        }
    }

    // MARK: materials

    private func materialSection(_ m: Material, _ res: Calc.RoomResult) -> some View {
        Section {
            materialResult(m, res)
            DisclosureGroup("Sizes and prices") {
                materialFields(m).padding(.vertical, 4)
            }
            .tint(m.color)
        } header: {
            Label { Text(m.title) } icon: { Image(systemName: m.symbol).foregroundStyle(m.color) }
        }
    }

    @ViewBuilder private func materialResult(_ m: Material, _ res: Calc.RoomResult) -> some View {
        let c = m.color
        if res.g.floor <= 0 && m != .paint {
            Text("Enter the room size first.").foregroundStyle(.secondary)
        } else {
            switch m {
            case .flooring:
                if let f = res.flooring {
                    HStack(spacing: 24) {
                        BigNumber(value: u.area(f.area), label: String(localized: "to buy"), color: c)
                        if f.boxes > 0 { BigNumber(value: "\(f.boxes)", label: String(localized: "boxes"), color: c) }
                    }
                    Line(label: "Floor area", value: u.area(res.g.floor))
                    Line(label: "Waste allowance", value: "\(u.num(room.m.flooring.waste))%")
                    if f.cost > 0 { Line(label: "Cost", value: u.money(f.cost)) }
                }
            case .tile:
                if let t = res.tile {
                    HStack(spacing: 24) {
                        BigNumber(value: u.int(t.tiles), label: String(localized: "tiles"), color: c)
                        if t.boxes > 0 { BigNumber(value: "\(t.boxes)", label: String(localized: "boxes"), color: c) }
                    }
                    Line(label: "Tile size", value: "\(u.small(room.m.tile.tw)) × \(u.small(room.m.tile.th))")
                    Line(label: "Area with waste", value: u.area(t.area))
                    Line(label: "Grout", value: "\(u.num(t.groutKg, 1)) kg")
                    if t.cost > 0 { Line(label: "Cost", value: u.money(t.cost)) }
                }
            case .paint:
                if let p = res.paint {
                    if p.area <= 0 {
                        Text("Enter the room size first.").foregroundStyle(.secondary)
                    } else {
                        BigNumber(value: u.volume(p.litres), label: String(localized: "of paint"), color: c)
                        Line(label: "Cans", value: u.cansText(p.litres))
                        Line(label: "Area to paint", value: u.area(p.area))
                        Line(label: "Coats", value: "\(room.m.paint.coats)")
                        if p.cost > 0 { Line(label: "Cost", value: u.money(p.cost)) }
                    }
                }
            case .wallpaper:
                if let w = res.wallpaper {
                    if res.g.height <= 0 {
                        Text("Enter the ceiling height first.").foregroundStyle(.secondary)
                    } else {
                        BigNumber(value: "\(w.rolls)", label: String(localized: "rolls"), color: c)
                        Line(label: "Strips", value: "\(w.strips) × \(u.len(w.stripLength))")
                        Line(label: "Strips per roll", value: "\(w.perRoll)")
                        if w.cost > 0 { Line(label: "Cost", value: u.money(w.cost)) }
                    }
                }
            case .baseboard:
                if let b = res.baseboard {
                    HStack(spacing: 24) {
                        BigNumber(value: u.len(b.length), label: String(localized: "total"), color: c)
                        BigNumber(value: "\(b.pieces)", label: "× \(u.len(room.m.baseboard.piece))", color: c)
                    }
                    Line(label: "Door openings left out", value: u.len(res.g.doorWidth))
                    if b.cost > 0 { Line(label: "Cost", value: u.money(b.cost)) }
                }
            }
        }
    }

    @ViewBuilder private func materialFields(_ m: Material) -> some View {
        let cur = u.currencySymbol
        switch m {
        case .flooring:
            Grid2 {
                NumberField(label: "Box covers", value: $room.m.flooring.box, factor: u.areaFactor, unit: u.areaUnit)
                NumberField(label: "Waste", value: $room.m.flooring.waste, unit: "%", digits: 1)
                NumberField(label: "Price per \(u.areaUnit)", value: $room.m.flooring.price, factor: 1 / u.areaFactor, unit: cur)
            }
        case .tile:
            Grid2 {
                NumberField(label: "Tile width", value: $room.m.tile.tw, factor: u.smallFactor, unit: u.smallUnit, digits: 1)
                NumberField(label: "Tile length", value: $room.m.tile.th, factor: u.smallFactor, unit: u.smallUnit, digits: 1)
                NumberField(label: "Joint", value: $room.m.tile.joint, factor: u.mmFactor, unit: u.mmUnit, digits: 3)
                NumberField(label: "Tile thickness", value: $room.m.tile.depth, factor: u.mmFactor, unit: u.mmUnit, digits: 3)
                NumberField(label: "Box covers", value: $room.m.tile.box, factor: u.areaFactor, unit: u.areaUnit)
                NumberField(label: "Waste", value: $room.m.tile.waste, unit: "%", digits: 1)
                NumberField(label: "Price per \(u.areaUnit)", value: $room.m.tile.price, factor: 1 / u.areaFactor, unit: cur)
            }
        case .paint:
            VStack(spacing: 10) {
                Toggle("Walls", isOn: $room.m.paint.walls)
                Toggle("Ceiling", isOn: $room.m.paint.ceiling)
                Stepper(value: $room.m.paint.coats, in: 1...5) {
                    LabeledContent("Coats") { Text("\(room.m.paint.coats)").monospacedDigit() }
                }
                Grid2 {
                    NumberField(label: "Coverage", value: $room.m.paint.coverage, factor: u.coverageFactor, unit: u.coverageUnit, digits: 1)
                    NumberField(label: "Price per \(u.volUnit)", value: $room.m.paint.price, factor: 1 / u.volFactor, unit: cur)
                }
            }
        case .wallpaper:
            Grid2 {
                NumberField(label: "Roll width", value: $room.m.wallpaper.rollW, factor: u.smallFactor, unit: u.smallUnit, digits: 1)
                NumberField(label: "Roll length", value: $room.m.wallpaper.rollL, factor: u.lenFactor, unit: u.lenUnit)
                NumberField(label: "Pattern repeat", value: $room.m.wallpaper.repeatLength, factor: u.smallFactor, unit: u.smallUnit, digits: 1)
                NumberField(label: "Price per roll", value: $room.m.wallpaper.price, unit: cur)
            }
        case .baseboard:
            Grid2 {
                NumberField(label: "Piece length", value: $room.m.baseboard.piece, factor: u.lenFactor, unit: u.lenUnit)
                NumberField(label: "Waste", value: $room.m.baseboard.waste, unit: "%", digits: 1)
                NumberField(label: "Price per piece", value: $room.m.baseboard.price, unit: cur)
            }
        }
    }
}

/// Two columns of fields.
struct Grid2<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], alignment: .leading, spacing: 10) {
            content
        }
    }
}
