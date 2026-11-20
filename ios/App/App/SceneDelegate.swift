import UIKit
import Capacitor
import RoomPlan
import simd

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = RoomcalcViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// The Capacitor web view plus Roomcalc's own native plugin.
class RoomcalcViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(RoomScanPlugin())
    }
}

private let turkish = Locale.preferredLanguages.first?.hasPrefix("tr") ?? false
private func L(_ en: String, _ tr: String) -> String { turkish ? tr : en }

/// `RoomScan.isSupported()` and `RoomScan.scan()`: Apple RoomPlan on devices with a LiDAR sensor.
/// scan() resolves with metres: floorArea, perimeter, height, walls/doors/windows [{w, h}], or {cancelled: true}.
@objc(RoomScanPlugin)
public class RoomScanPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RoomScanPlugin"
    public let jsName = "RoomScan"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise)
    ]

    @objc func isSupported(_ call: CAPPluginCall) {
        call.resolve(["supported": RoomCaptureSession.isSupported])
    }

    @objc func scan(_ call: CAPPluginCall) {
        guard RoomCaptureSession.isSupported else {
            call.reject(L("Room scanning needs an iPhone with a LiDAR sensor.", "Oda tarama LiDAR sensörlü bir iPhone gerektirir."))
            return
        }
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else { call.reject("No view controller"); return }
            let vc = RoomScanViewController()
            vc.modalPresentationStyle = .fullScreen
            vc.onFinish = { room, error in
                vc.dismiss(animated: true)
                if let error = error { call.reject(error.localizedDescription); return }
                guard let room = room else { call.resolve(["cancelled": true]); return }
                call.resolve(RoomScanPlugin.summary(of: room))
            }
            presenter.present(vc, animated: true)
        }
    }

    static func summary(of room: CapturedRoom) -> [String: Any] {
        let size: (CapturedRoom.Surface) -> [String: Double] = { ["w": Double($0.dimensions.x), "h": Double($0.dimensions.y)] }
        let perimeter = room.walls.reduce(0.0) { $0 + Double($1.dimensions.x) }
        let height = room.walls.map { Double($0.dimensions.y) }.max() ?? 0
        return [
            "floorArea": floorArea(of: room),
            "perimeter": perimeter,
            "height": height,
            "walls": room.walls.map(size),
            // Openings without a door still take wall (and baseboard) away, like a door.
            "doors": (room.doors + room.openings).map(size),
            "windows": room.windows.map(size)
        ]
    }

    /// iOS 17 gives the floor outline directly. Earlier, chain the walls end to end and take the enclosed area.
    static func floorArea(of room: CapturedRoom) -> Double {
        if #available(iOS 17.0, *), !room.floors.isEmpty {
            let a = room.floors.reduce(0.0) { sum, f in
                let poly = polygonArea3D(f.polygonCorners)
                return sum + (poly > 0 ? poly : Double(f.dimensions.x * f.dimensions.y))
            }
            if a > 0 { return a }
        }
        return wallLoopArea(room.walls)
    }

    /// Area of a planar polygon in 3-D (Newell's method).
    static func polygonArea3D(_ p: [simd_float3]) -> Double {
        guard p.count >= 3 else { return 0 }
        var n = simd_double3(0, 0, 0)
        for i in 0..<p.count {
            let a = simd_double3(p[i]), b = simd_double3(p[(i + 1) % p.count])
            n += simd_cross(a, b)
        }
        return simd_length(n) / 2
    }

    static func wallLoopArea(_ walls: [CapturedRoom.Surface]) -> Double {
        var segs: [(SIMD2<Double>, SIMD2<Double>)] = walls.map { w in
            let t = w.transform
            let c = SIMD2(Double(t.columns.3.x), Double(t.columns.3.z))
            let d = simd_normalize(SIMD2(Double(t.columns.0.x), Double(t.columns.0.z)))
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

/// Full-screen RoomPlan capture with Cancel / Done, then "Use scan" once the 3-D result is shown.
class RoomScanViewController: UIViewController, RoomCaptureViewDelegate {
    var onFinish: ((CapturedRoom?, Error?) -> Void)?
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

        var done = UIButton.Configuration.filled()
        done.cornerStyle = .capsule
        done.baseBackgroundColor = UIColor(red: 0.91, green: 0.35, blue: 0.05, alpha: 1)
        done.title = L("Done", "Bitti")
        doneButton.configuration = done
        doneButton.addTarget(self, action: #selector(doneTapped), for: .touchUpInside)

        var cancel = UIButton.Configuration.gray()
        cancel.cornerStyle = .capsule
        cancel.title = L("Cancel", "Vazgeç")
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
        if let room = result { finish(room, nil); return }
        // Stop scanning; RoomPlan processes the data and shows the finished model.
        captureView.captureSession.stop()
        doneButton.isEnabled = false
        doneButton.configuration?.showsActivityIndicator = true
    }

    @objc private func cancelTapped() {
        captureView.captureSession.stop()
        finish(nil, nil)
    }

    private func finish(_ room: CapturedRoom?, _ error: Error?) {
        guard !finished else { return }
        finished = true
        onFinish?(room, error)
    }

    // MARK: RoomCaptureViewDelegate

    func captureView(shouldPresent roomDataForProcessing: CapturedRoomData, error: Error?) -> Bool {
        return true
    }

    func captureView(didPresent processedResult: CapturedRoom, error: Error?) {
        if let error = error, processedResult.walls.isEmpty { finish(nil, error); return }
        result = processedResult
        doneButton.configuration?.showsActivityIndicator = false
        doneButton.configuration?.title = L("Use scan", "Taramayı kullan")
        doneButton.isEnabled = true
    }
}
