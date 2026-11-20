import SwiftUI

/// A decimal field bound to a metric value. `factor` converts metres (or m², L…) to the number shown.
/// Accepts both "2.5" and "2,5". Updates the value on every keystroke.
struct NumberField: View {
    let label: LocalizedStringKey
    @Binding var value: Double
    var factor: Double = 1
    var unit: String = ""
    var digits: Int = 2
    @State private var text = ""
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.caption.weight(.semibold)).foregroundStyle(.secondary).lineLimit(1)
            HStack(spacing: 4) {
                TextField("0", text: $text)
                    .keyboardType(.decimalPad)
                    .focused($focused)
                    .font(.body.weight(.semibold).monospacedDigit())
                    .accessibilityLabel(Text(label))
                if !unit.isEmpty { Text(unit).font(.subheadline).foregroundStyle(.secondary) }
            }
            .padding(.horizontal, 10).padding(.vertical, 9)
            .background(Color(.tertiarySystemFill), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).stroke(focused ? Color.accentColor : .clear, lineWidth: 1.5))
        }
        .onAppear { text = format(value / factor) }
        .onChange(of: text) { _, t in
            if let v = NumberField.parse(t) { value = v * factor }
        }
        .onChange(of: value) { _, v in
            if !focused { text = format(v / factor) }
        }
    }

    private func format(_ v: Double) -> String {
        v == 0 ? "" : v.formatted(.number.precision(.fractionLength(0...digits)).grouping(.never))
    }

    static func parse(_ t: String) -> Double? {
        let s = t.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ",", with: ".")
        if s.isEmpty { return 0 }
        guard let v = Double(s), v >= 0 else { return nil }
        return v
    }
}

/// Room length: metres, or feet + inches side by side.
struct LengthField: View {
    let label: LocalizedStringKey
    @Binding var value: Double
    @Environment(\.units) private var u

    var body: some View {
        if u.imperial {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    NumberField(label: label, value: feet, unit: "ft", digits: 0)
                    NumberField(label: " ", value: inches, unit: "in", digits: 1)
                }
            }
        } else {
            NumberField(label: label, value: $value, unit: "m")
        }
    }

    private var feet: Binding<Double> {
        Binding(get: { feetPart }, set: { value = $0 * Units.ft + inchesPart * Units.inch })
    }
    private var inches: Binding<Double> {
        Binding(get: { inchesPart }, set: { value = feetPart * Units.ft + $0 * Units.inch })
    }
    private var feetPart: Double { (value / Units.ft + 1e-6).rounded(.down) }
    private var inchesPart: Double { ((value - feetPart * Units.ft) / Units.inch * 10).rounded() / 10 }
}

struct BigNumber: View {
    let value: String
    let label: String
    let color: Color
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(value).font(.system(size: 30, weight: .bold, design: .rounded)).foregroundStyle(color).monospacedDigit()
                .lineLimit(1).minimumScaleFactor(0.6)
            Text(label).font(.caption.weight(.semibold)).foregroundStyle(.secondary)
        }
    }
}

struct Stat: View {
    let label: LocalizedStringKey
    let value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label).font(.caption2.weight(.semibold)).textCase(.uppercase).foregroundStyle(.secondary)
            Text(value).font(.headline.monospacedDigit()).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct Line: View {
    let label: LocalizedStringKey
    let value: String
    var body: some View {
        LabeledContent { Text(value).fontWeight(.semibold).monospacedDigit() } label: { Text(label) }
    }
}

/// Icon in a tinted rounded square, like Settings.
struct MaterialIcon: View {
    let symbol: String
    let color: Color
    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(.white)
            .frame(width: 28, height: 28)
            .background(color.gradient, in: RoundedRectangle(cornerRadius: 7, style: .continuous))
    }
}

func dismissKeyboard() {
    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
}
