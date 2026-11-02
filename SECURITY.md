# Security policy

This is a localhost research application with no authentication layer. Bind both servers to `127.0.0.1`. Do not expose the development API publicly. It can import datasets only from the explicit local CLI; the API accepts neither filesystem paths nor model uploads. Fixed local joblib files are loaded only from model IDs `synthetic` and `bts`. Never replace them with untrusted pickle files.

Geography, page size, prediction inputs and simulation budgets are validated. Provider URLs are fixed, requests have timeouts/backoff, caches are bounded, and SQL values are parameterized. Simulation calls are serialized per worker; do not use multiple backend workers to bypass provider limits. There are no telemetry or application secrets.

For a vulnerability, use the repository's private security reporting facility if enabled. Otherwise open an issue requesting a private reporting channel without including exploitable details or secrets. Never post tokens or private flight data in issues.
