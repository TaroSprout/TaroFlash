---
lastUpdated: 2026-08-15T00:00:00Z
paths:
  - 'src/**/*.{vue,css}'
---

# Accent role vs. neutral role

**Owns the choice between an accent role, which follows the member's palette, and a neutral station
role, which doesn't.**

The split is by _switch_, not by shade: the accent roles (`accent`, `accent-muted`, `on-accent`,
`accent-text`, `accent-pattern`) are answered by `data-palette`; every neutral role (`surface`,
`well`, `raised`, `raised-tint`, `raised-shade`, `line`, `ink`, `ink-muted`, `skeleton`,
`skeleton-sheen`) is answered by `data-station`. The two sets are disjoint, so a choice between them
is a choice about which switch should move the element.

- **Default to a neutral role.** Reach for an accent role only where the element carries identity or
  a semantic meaning: a primary action, a selected or checked state, a destructive control, a deck
  cover. Chrome — labels, idle states, dividers, panels, skeletons — stays neutral, so it reads the
  same whichever palette the member picked.
- **An accent role needs `data-palette` on that same element.** An accent role with no palette in
  scope falls back to the blue default rather than the colour you meant, which reads as correct on a
  blue account and wrong on every other.
- **Never re-derive a rendition with a `dark:` variant** — `bg-raised`, not
  `bg-brown-300 dark:bg-stone-700`. Both renditions already live in the role, and the pair drifts
  from the station the moment either is retuned.
- **Text on a neutral surface uses `accent-text`, not `accent`.** `accent` is tuned as a fill and
  goes illegible at body size; `accent-text` is the same identity darkened to read as text.
- **Text on an accent fill uses `on-accent`** — pairing `text-ink` with an accent background hands
  the label a colour tuned for the station behind it, not for the fill it's actually sitting on.
- **A role that isn't resting on a station doesn't take one.** A badge or ring on an accent fill uses
  the fixed `knockout` / `card` / `mat` roles; borrowing a station role there looks right in one mode
  and inverts in the other →[K:fixed-roles-skip-the-station].

Mixing both in one component is normal — a toggle's label and off-track stay neutral while the
on-track takes `accent` / `on-accent`.
