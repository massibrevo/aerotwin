# Troubleshooting

- Python installation: use 3.12/3.13 if a newer interpreter lacks scientific wheels. Bootstrap requires >=3.12 and Node >=20. Do not disable TLS validation.
- Busy port: preserve unrelated services. `python scripts/dev.py --frontend-port 5188`; then verify with the same flag and use `AEROTWIN_URL=http://127.0.0.1:5188` for Playwright. Free backend port 8000 before launch.
- No BTS/model: expected on first launch. Select Synthetic examples, or import an official CSV then train `bts`. Unknown origin zones require `--timezone-map zones.json`. DST ambiguity must be resolved in the source, not guessed.
- Live 429/error: respect cooldown. Select demo/replay explicitly; no fabricated LIVE fallback. Do not run multiple provider workers to bypass limits.
- Map/WebGL failure: use the bundled offline SVG. Online tiles are optional and no bulk cache is implemented.
- Browser tests: from frontend run `npx playwright install chromium` (Linux CI adds `--with-deps`), start both servers, then `npm run test:e2e`. Keep `PLAYWRIGHT_BROWSERS_PATH` consistent if customized. On macOS, if downloaded Chromium stalls on rendering, installed Chrome can be selected with `AEROTWIN_BROWSER_CHANNEL=chrome`. Do not mark failed tests passed.
- Library deprecation warnings remain visible and do not imply failed assertions. Pin tested versions for reproduction. `LOKY_MAX_CPU_COUNT=2` avoids a joblib macOS CPU-detection warning.
- Simulation history is intentionally bounded in server memory (50 runs). It resets on restart; model reports persist locally. Durable experiment history/monthly partitions are future improvements.
