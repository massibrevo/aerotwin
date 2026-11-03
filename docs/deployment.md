# Distribution and operation — 0.2

This is a **local software distribution**, not public SaaS or a signed native app. Release ZIPs include compiled frontend assets and Python source, but no Python interpreter or virtual environment. Python 3.12/3.13 and Internet for first dependency installation are required. No Node is required for a ZIP; source compilation needs Node 20+/npm.

```bash
python scripts/bootstrap.py
python scripts/serve.py
python scripts/verify.py --base-url http://127.0.0.1:5188
```

One loopback server serves API and UI. Use `--port` to avoid occupied ports; never kill unrelated services. Keep the launch terminal open. Ctrl-C stops the service. `/api/v1/health` is liveness; `/api/v1/ready` checks demo data revision and trusted local artifact integrity. Interactive Swagger UI may fetch its UI assets from its default CDN; the application and `/openapi.json` work locally.

For updates/backups, set AEROTWIN_HOME consistently, stop the application before copying state and preserve original imported CSVs. Prior monthly snapshots and model artifacts are retained; automatic disk cleanup and rollback UI are not supplied. Interrupted browser jobs become failed on restart. Do not run concurrent CLI writers or multiple Uvicorn workers against the same provider/state.

For maintainers: build/test first, stage tracked source files, run `python scripts/package_release.py`, extract the ZIP into an isolated folder, run its bootstrap without compiling Node assets, start its server and run verify/browser checks. Publish the archive and its SHA-256 as GitHub release assets only after passing those checks. The internal `RELEASE-MANIFEST.json` lists per-file digests; checksums are integrity checks, not signed authenticity proofs.

Development remains `bootstrap.py --dev` / `dev.py`; production is `serve.py`. Public hosting would require authentication, HTTPS, deployment hardening and resource isolation; none is enabled by this release. A frontend-only GitHub Pages build cannot provide Python inference or simulation.
