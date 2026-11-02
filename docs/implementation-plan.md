# Implementation plan

1. Build deterministic synthetic flights and replay, typed ADS-B parsing and bounded provider access.
2. Implement BTS CSV ingestion, Parquet/DuckDB analytics, temporal ML and paired queue simulation.
3. Build eight routed React screens with interactive offline/online radar and explicit provenance.
4. Bootstrap locally, run backend/UI/E2E/build checks, capture actual evidence, then publish if authenticated.

Tradeoffs: CPU scikit-learn regression rather than optional LightGBM/GNN; explicit stylized connections rather than invented tail rotations. Runtime artifacts are generated locally and excluded from Git. No Sites hosting: the requested deliverable is a local Python/React application published as source on GitHub.
