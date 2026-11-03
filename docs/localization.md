# Bilingual interface · AeroTwin 0.6

Choose **English / Italiano** in the top bar. English is the initial default; a saved valid choice is restored on startup. The preference is stored as `aerotwin:locale` in this browser. A blocked storage backend still permits an in-memory choice. Changes propagate to open tabs through browser storage events and set HTML `lang` for assistive technology.

Every page subscribes to a shared React store, including memoised pages. Presentation text uses reviewed local catalogs; no online translator, credentials or telemetry is involved. Switching locale updates existing controls and errors without remounting pages or refetching analysis data. Existing form values, selected aircraft, units, theme and recording state remain intact. Command search supports translated labels and their original English names.

| English | Italiano |
| --- | --- |
| Control tower | Torre di controllo |
| Live radar | Radar in tempo reale |
| Airport pulse | Traffico aeroportuale |
| Historical explorer | Esplora storico |
| Forecast lab | Laboratorio previsioni |
| Analytics studio | Analisi e statistiche |
| Airport explorer | Esplora aeroporti |
| Disruption simulator | Simulatore di disservizi |
| Data & experiments | Dati ed esperimenti |
| Methodology | Metodologia |
| Mathematical methods | Metodi matematici |
| User guide | Guida all’uso |

MAE, RMSE, METAR, ICAO, UTC, LIVE, units and mathematical variable names retain their technical spelling. Italian prose distinguishes mean absolute error, uncertainty coverage, descriptive comparisons and causal effects; the mathematical meaning does not change. Numeric presentation uses `it-IT`/`en-US`; locally displayed session dates follow the locale. UTC/API timestamps and HTML date-input values retain their underlying ISO representation. A browser's native date-picker chrome follows browser/OS preferences.

Original METAR reports, official airport names/codes, aircraft registrations/callsigns, external credits, personal recording labels and raw JSON/CSV stay in source form. Original downloaded datasets and persisted models are never translated or rewritten. User data is not an interface translation key. Mathematical prose is translated in `/math`; formulas and the linked complete technical Markdown appendix retain their scientific notation. Unrecognised external-provider diagnostics remain verbatim rather than receiving a guessed meaning.

## Maintaining translations

- `frontend/src/i18n.tsx` owns the store, presentation lookup and reviewed dynamic-message patterns.
- `frontend/src/locales/it.ts` maps English interface phrases to Italian. `en.ts` contains the English counterpart of the originally Italian guide.
- Components call `useLocale()` to subscribe and `tx()` only on presentation strings. Keep identifiers, payload keys, source data and input values outside translation calls.
- Add new prose to the catalog. `i18n-coverage.test.ts` rejects untranslated static presentation text unless explicitly marked invariant. Review dynamic templates and server messages separately.
- Do not change model features, API contracts, numeric values or exports for translation. Updating scientific terminology requires checking the mathematical-methods document.

Validation covers all twelve routes in Italian, command navigation, reload persistence, mobile overflow, radar selection and unit preservation, and translating an existing API error without a new request. Unit tests cover memoised state preservation, raw-data/formula invariants and blocked local storage. The full English browser suite remains the regression baseline. See [verification](evaluation-v0.6.md) for executed checks.
