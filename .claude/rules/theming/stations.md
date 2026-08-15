---
lastUpdated: 2026-08-14T00:00:00Z
paths:
  - 'src/**/*.{vue,css}'
---

# Declaring a station

**Owns which background class pairs with a `data-station` attribute on the element carrying it.**
Role meanings and the station list are corpus fact ([[surface-stations]]); this is the practice.

- The element that carries `data-station="X"` styles its own background `bg-surface` — never
  `bg-raised` or `bg-well`, which are for a child resting inside that station, not the station root
  itself. Pairing the root with a role other than `surface` repaints it with a value a child control
  may read for its own state, so the two collapse into each other.
