import SwiftUI
import RoomPlan
import simd

struct ScanResult {
    var scan: ScanData
    var openings: [Opening]
}

/// Full-screen Apple RoomPlan capture. Calls `onFinish(nil)` when cancelled.
struct ScanView: UIViewControllerRepresentable {
    var onFinish: (ScanResult?) -> Void

    func makeUIViewController(context: Context) -> RoomScanViewController {
        let vc = RoomScanViewController()
        vc.onFinish = { room in onFinish(room.map(ScanView.result)) }
        return vc
    }

    func updateUIViewController(_ vc: RoomScanViewController, context: Context) {}

    static func result(_ room: CapturedRoom) -> ScanResult {
        let walls = room.walls.map { WallSize(w: Double($0.dimensions.x), h: Double($0.dimensions.y)) }
        let perimeter = walls.reduce(0) { $0 + $1.w }
        let height = walls.map(\.h).max() ?? 0
        // Openings without a door still take wall (and baseboard) away, like a door.
        let doors = (room.doors + room.openings).map { Opening(kind: .door, w: Double($0.dimensions.x), h: Double($0.dimensions.y)) }
        let windows = room.windows.map { Opening(kind: .window, w: Double($0.dimensions.x), h: Double($0.dimensions.y)) }
        return ScanResult(scan: ScanData(floorArea: floorArea(room), perimeter: perimeter, height: height, walls: walls),
                          openings: doors + windows)
    }

    /// The floor outline when RoomPlan found one; otherwise the walls chained end to end.
    static func floorArea(_ room: CapturedRoom) -> Double {
        let fromFloors = room.floors.reduce(0.0) { sum, f in
            let a = polygonArea3D(f.polygonCorners)
            return sum + (a > 0 ? a : Double(f.dimensions.x * f.dimensions.y))
        }
        return fromFloors > 0 ? fromFloors : wallLoopArea(room.walls)
    }

    /// Area of a planar polygon in 3-D (Newell's method).
    static func polygonArea3D(_ p: [simd_float3]) -> Double {
        guard p.count >= 3 else { return 0 }
        var n = SIMD3<Double>(0, 0, 0)
        for i in 0..<p.count {
            let a = SIMD3<Double>(Double(p[i].x), Double(p[i].y), Double(p[i].z))
            let j = (i + 1) % p.count
            let b = SIMD3<Double>(Double(p[j].x), Double(p[j].y), Double(p[j].z))
            n += simd_cross(a, b)
        }
        return simd_length(n) / 2
    }

    static func wallLoopArea(_ walls: [CapturedRoom.Surface]) -> Double {
        var segs: [(SIMD2<Double>, SIMD2<Double>)] = walls.map { w in
            let t = w.transform
            let c = SIMD2<Double>(Double(t.columns.3.x), Double(t.columns.3.z))
            let d = simd_normalize(SIMD2<Double>(Double(t.columns.0.x), Double(t.columns.0.z)))
            let half = Double(w.dimensions.x) / 2
            return (c - d * half, c + d * half)
        }
        guard !segs.isEmpty else { return 0 }
        let first = segs.removeFirst()
        var pts = [first.0, first.1]
        var cur = first.1
        while !segs.isEmpty {
            var best = 0, flip = false, dist = Double.infinity
            for (i, s) in segs.enumerated() {
                let d0 = simd_distance(s.0, cur), d1 = simd_distance(s.1, cur)
                if d0 < dist { dist = d0; best = i; flip = false }
                if d1 < dist { dist = d1; best = i; flip = true }
            }
            let s = segs.remove(at: best)
            cur = flip ? s.0 : s.1
            pts.append(cur)
        }
        var a = 0.0
        for i in 0..<pts.count {
            let p = pts[i], q = pts[(i + 1) % pts.count]
            a += p.x * q.y - q.x * p.y
        }
        return abs(a) / 2
    }
}

/// RoomPlan capture view with Cancel / Done, then "Use scan" once the finished 3-D model is shown.
final class RoomScanViewController: UIViewController, RoomCaptureViewDelegate {
    var onFinish: ((CapturedRoom?) -> Void)?
    private var captureView: RoomCaptureView!
    private var result: CapturedRoom?
    private var finished = false
    private let doneButton = UIButton(type: .system)
    private let cancelButton = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        captureView = RoomCaptureView(frame: view.bounds)
        captureView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        captureView.delegate = self
        view.addSubview(captureView)

        var done = UIButton.Configuration.borderedProminent()
        done.cornerStyle = .capsule
        done.title = String(localized: "Done")
        doneButton.configuration = done
        doneButton.tintColor = UIColor(named: "AccentColor")
        doneButton.addTarget(self, action: #selector(doneTapped), for: .touchUpInside)

        var cancel = UIButton.Configuration.gray()
        cancel.cornerStyle = .capsule
        cancel.title = String(localized: "Cancel")
        cancelButton.configuration = cancel
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)

        for b in [doneButton, cancelButton] {
            b.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(b)
        }
        NSLayoutConstraint.activate([
            cancelButton.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
            cancelButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
            doneButton.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
            doneButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8)
        ])
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        UIApplication.shared.isIdleTimerDisabled = true
        captureView.captureSession.run(configuration: RoomCaptureSession.Configuration())
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        UIApplication.shared.isIdleTimerDisabled = false
    }

    @objc private func doneTapped() {
        if let room = result { finish(room); return }
        // Stop scanning; RoomPlan processes the data and shows the finished model.
        captureView.captureSession.stop()
        doneButton.isEnabled = false
        doneButton.configuration?.showsActivityIndicator = true
    }

    @objc private func cancelTapped() {
        captureView.captureSession.stop()
        finish(nil)
    }

    private func finish(_ room: CapturedRoom?) {
        guard !finished else { return }
        finished = true
        onFinish?(room)
    }

    // MARK: RoomCaptureViewDelegate

    func captureView(shouldPresent roomDataForProcessing: CapturedRoomData, error: Error?) -> Bool { true }

    func captureView(didPresent processedResult: CapturedRoom, error: Error?) {
        result = processedResult
        doneButton.configuration?.showsActivityIndicator = false
        doneButton.configuration?.title = String(localized: "Use scan")
        doneButton.isEnabled = true
    }
}
