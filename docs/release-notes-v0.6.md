# AeroTwin 0.6.0 — Italian and English throughout the workspace

The top-bar language selector switches every page between English and Italian and remembers the choice. Navigation, aircraft observation controls, recording/replay, airport references, analytics, forecast diagnostics, methodology and the user guide now use consistent terminology. Accessible labels, tooltips, common server errors, numeric separators and displayed session dates follow the selected language. The compact mobile header keeps language and data status visible.

Language changes preserve aircraft selection, unit choices and form state, and do not issue translation requests or alter model/data calculations. Raw aviation reports, airport names/codes, personal recording labels, formulas and exported CSV/JSON retain their source representation. Unknown external diagnostics remain verbatim.

Includes the scalable radar, local observation recording, airport explorer and mathematical documentation from 0.5. Download the ZIP, extract it, use Python 3.12 and run `python scripts/bootstrap.py`, then `python scripts/serve.py`. The compiled ZIP needs no Node runtime. Select **Italiano** in the upper bar; consult `docs/guida-italiano.md`, `docs/localization.md` and `docs/mathematical-methods.md` for usage and limits.
