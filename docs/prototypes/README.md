# Prototypes

Clickable HTML prototypes made while planning. Open them in a browser to see the intended layout, tabs and wording. They are **references, not code to copy**: each stores data in the browser or in a Claude artifact store, and some actions are simulated.

| File | Shows | Built in |
| --- | --- | --- |
| `brand-questionnaire.html` | The client brand discovery questionnaire (becomes `/start/[token]`) | Phase 2 |
| `account-desk.html` | The account exec's Account Desk (becomes `/accounts`) | Phase 2 |
| `design-studio.html` | The Design Studio with brand kit, weekly board, time and resources (becomes `/creative`) | Phase 3 |
| `client-portal.html` | The client portal with sample data; sign in with `MM-KGC-2611` / `kgosi2026` (becomes `/portal`) | Phase 4 |

Where a prototype and the spec disagree, **the spec wins**. In particular, the prototypes pass data between tools with CSV files; in the app those hand-offs disappear because everything shares one database (see `docs/spec/00-overview.md`).
