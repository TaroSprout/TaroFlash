---
title: Study Session Architecture
lastUpdated: 2026-07-21T00:00:00Z
paths:
  - 'src/views/study-session/**'
---

# Study Session Architecture

The whole feature lives under `src/views/study-session/`.

- `index.vue` — entry point (routed view). Resolves the deck(s), calls `provideStudySessionController`.
- `composables/session-controller.ts` — composition root. Wires deck resolution, the engine, card edit/preview/actions, persistence, and prefs; provides the result via inject so `index.vue`, the header, and `session-studying/` share one instance.
- `composables/session-engine.ts` — deck-blind state machine owning the lifecycle, FSRS queue, card sides, and per-card scheduling. Knows nothing about decks beyond each card's `deck_id`, handed to injected `schedulerFor` / `startingSideFor` callbacks.
- `composables/` also holds supporting seams: `session-cards.ts` (fetch/seed), `session-persistence.ts` (sessionStorage restore), `session-prefs.ts`, `session-resume.ts`, `card-preview.ts`, `card-edit.ts`, `card-actions.ts`, `cover-carousel.ts`, `study-modal.ts`.
- `deck-resolution.ts` — per-deck scheduler/starting-side/shuffle lookups, provided to the engine.
- `session-studying/` — active-study UI (card stage, rating buttons, progress, edit footer).
- `session-summary/` — post-session summary and stat aggregation.

## Lifecycle

Single source: `SessionState` in `session-engine.ts` — `loading -> cover -> studying -> summary`. The engine owns the transitions; `is_cover` and `display_side` derive from it.
