# Local deployment and source publication

Run bootstrap, then dev.py. Both services bind to localhost. `--frontend-port 5188` handles an occupied standard port; backend remains fixed at 8000. Vite proxies `/api`. No hosted backend/database/account/key is required. A production frontend bundle alone cannot replace Python; a static GitHub Pages demo is future scope.

Before publishing: verify both servers, backend tests/lint, frontend tests/build, browser flows, `.gitignore`, source provenance and secret exclusions. Generated models, raw imports, observations and credentials stay local. GitHub Actions uses deterministic mocked sources.

```bash
gh auth login
gh repo create aerotwin --public --source=. --remote=origin --push --description "Open-source aviation intelligence: live ADS-B radar, historical flight analytics, delay forecasting, and disruption simulation."
gh repo view --json url,visibility
```

Use aerotwin-aviation only if the first name is occupied; never overwrite unrelated work. Compare local HEAD with remote main before claiming successful publication. A CI workflow is not a passed CI run until its actual result is available. Do not expose this unauthenticated dev API publicly.
