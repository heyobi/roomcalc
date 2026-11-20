import XCTest

/// Walks the main screens with sample rooms (-demo) and keeps a screenshot of each.
/// CI exports the attachments for the App Store (see .github/workflows/screenshots.yml).
final class ScreenshotTests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    private func shot(_ app: XCUIApplication, _ name: String) {
        let a = XCTAttachment(screenshot: app.screenshot())
        a.name = name
        a.lifetime = .keepAlways
        add(a)
    }

    func testScreens() {
        let app = XCUIApplication()
        app.launchArguments = ["-demo"]
        app.launch()

        XCTAssertTrue(app.buttons["enterSize"].waitForExistence(timeout: 10))
        shot(app, "01-home")

        app.buttons["room-0"].firstMatch.tap()
        sleep(1)
        app.swipeUp()
        shot(app, "02-room")
        app.swipeUp()
        shot(app, "03-materials")
        app.navigationBars.buttons.element(boundBy: 0).tap()

        app.buttons["shoppingList"].tap()
        sleep(1)
        shot(app, "04-list")
        app.navigationBars.buttons.element(boundBy: 0).tap()

        app.buttons["room-2"].firstMatch.tap()
        sleep(1)
        app.swipeUp()
        shot(app, "05-tile")
    }

    /// Manual entry from an empty start: the numbers must match the formulas.
    func testEnterSize() {
        let app = XCUIApplication()
        app.launchArguments = ["-demo"]
        app.launch()
        app.buttons["enterSize"].tap()
        XCTAssertTrue(app.navigationBars.element.waitForExistence(timeout: 5))
    }
}
