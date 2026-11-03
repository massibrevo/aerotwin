# Security policy — local distribution

AeroTwin is a localhost research application without a user-account system. Keep one server/worker bound to `127.0.0.1`. Trusted Host filtering and cross-site write rejection reduce browser-to-local attacks, but do not make the service suitable for public hosting. A trusted computer and trusted local users remain assumptions.

Browser CSV import is capped at 20 MiB, accepts file contents rather than paths and removes its temporary upload after processing. Import/train writes are serialized within the server. The CLI accepts explicit local file paths and is intended for the owner; avoid concurrent CLI writers. No user-controlled URL fetch, remote model upload or arbitrary filesystem API is implemented. SQL values are parameterized. Prediction/scenario bodies reject unknown fields and bound resource-heavy inputs.

Only fixed-ID locally trained model manifests are loaded, with artifact path validation, revision/dependency checks and SHA-256 integrity. **Never replace models with untrusted joblib/pickle files.** A checksum detects damage but is not a signature or a sandbox against malicious pickles. Filesystem access to the writable state root is security-sensitive; keep it private.

The source and release packager exclude credentials, local environments, imported raw/processed data, models and observed ADS-B payloads. There is no telemetry or required runtime secret. Do not publish private flight data in issues/screenshots. For a vulnerability, use GitHub private reporting if enabled; otherwise request a private channel without posting exploit details or secrets.
