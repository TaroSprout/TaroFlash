---
lastUpdated: 2026-08-15T00:00:00Z
paths:
  - 'src/views/study-session/**'
---

# Study session

**Owns the study-session lifecycle contract.** Reaches you editing anything under
`src/views/study-session/`.

## Lifecycle

- Treat `SessionState` in `session-engine.ts` as the single source for the session lifecycle
  (`loading -> cover -> studying -> summary`) — derive `is_cover` and `display_side` from it, never
  track either as separate state.
