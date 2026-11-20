# Roomcalc

**Scan a room or type its size, and see what to buy.** An iPhone app that turns room measurements into a shopping list for
flooring, tile (with grout), paint, wallpaper and baseboard, with costs. No account, no ads, no subscription; works offline.

- **LiDAR room scan** (iPhone Pro models) with Apple RoomPlan: floor area, wall lengths, ceiling height, doors and windows in one walk around the room.
- **Manual entry** for every iPhone: length × width × height, extra parts for L-shaped rooms, areas that are not covered (cabinets, island, tub), doors and windows.
- **Materials:** flooring boxes with waste allowance; tiles and boxes with joint width and grout (kg); paint litres or gallons with the can sizes to buy (walls and/or ceiling, coats, coverage); wallpaper rolls with pattern repeat; baseboard length and pieces.
- **Shopping list** across all rooms, shareable as text. Metric and imperial (feet + inches), English and Turkish.

## Formulas

All in `src/calc.ts`, tested in `tests/calc.test.ts`:

- Floor = length × width + extra parts − uncovered areas. Walls = perimeter × height − doors − windows.
- Flooring/tile area × (1 + waste %). Tiles = area ÷ ((tile width + joint) × (tile length + joint)).
- Grout (kg/m²) = (A + B) ÷ (A × B) × thickness × joint × 1.6 (A, B, thickness, joint in mm).
- Paint = area × coats ÷ coverage. Wallpaper strips = (perimeter − door widths) ÷ roll width; strip = height + 10 cm, rounded up to the pattern repeat; rolls = strips ÷ ⌊roll length ÷ strip⌋.
- Baseboard = (perimeter − door widths) × (1 + waste %).

## Development

Capacitor 8 + Vite + TypeScript, plain DOM. The RoomPlan scanner is a native plugin in `ios/App/App/SceneDelegate.swift`.

```bash
npm install
npm run dev          # browser preview (?scan fakes a LiDAR scan)
npm test             # formula tests
npm run build && npx vite preview --port 4183 &
APP_URL='http://localhost:4183/?selftest&scan' node tests/webkit/app.mjs   # end-to-end in WebKit
```

Every push to `main` runs the tests, the WebKit check, then builds and uploads to TestFlight (`.github/workflows/ios-testflight.yml`).
Repository secrets: `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_PRIVATE_KEY`, `BUILD_CERTIFICATE_BASE64`, `P12_PASSWORD`, `KEYCHAIN_PASSWORD`.

## License

MIT
