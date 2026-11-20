import SwiftUI

struct SettingsView: View {
    @Environment(RoomStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @AppStorage("units.imperial") private var imperial = Units.defaultImperial
    @AppStorage("appearance") private var appearance = "system"

    var body: some View {
        NavigationStack {
            Form {
                Section("Units") {
                    Picker("Units", selection: $imperial) {
                        Text("Metric (m, m²)").tag(false)
                        Text("Imperial (ft, ft²)").tag(true)
                    }
                    .pickerStyle(.segmented)
                    .labelsHidden()
                }
                Section("Appearance") {
                    Picker("Appearance", selection: $appearance) {
                        Text("System").tag("system")
                        Text("Light").tag("light")
                        Text("Dark").tag("dark")
                    }
                    .pickerStyle(.segmented)
                    .labelsHidden()
                }
                Section {
                    Button {
                        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                    } label: {
                        LabeledContent("Language") { Image(systemName: "arrow.up.forward.app") }
                    }
                } footer: {
                    Text("Roomcalc follows your iPhone's language. You can pick another one for this app in Settings.")
                }
                Section {
                    LabeledContent("Version", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0")
                    Link("Privacy policy", destination: URL(string: "https://github.com/heyobi/roomcalc/blob/main/PRIVACY.md")!)
                } footer: {
                    Text("Everything stays on this iPhone. No account, no ads, no tracking. Room scanning uses Apple RoomPlan and the LiDAR sensor; the camera image never leaves the phone.")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
            .onChange(of: imperial) { _, imp in store.switchDefaults(toImperial: imp) }
        }
    }
}
