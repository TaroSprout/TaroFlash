---
lastUpdated: 2026-08-15T00:00:00Z
paths:
  - 'src/**/*.{vue,css}'
---

# Adding a role vs. remapping one

**Owns what to do when no existing role answers the colour you need.**

- **Exhaust the ten neutral roles first.** A form control's recess is `well`, a chip resting on a
  surface is `raised`, its two-tone companions are `raised-tint` / `raised-shade` — a new role named
  for a widget (`input`, `card-header`) duplicates one of these under a narrower name and then has to
  be retuned separately for every station.
- **Remap a role locally rather than adding one, when a single control needs the swap.** Setting the
  custom property in place keeps every child utility working and costs nothing at the theme layer:

```html
<!-- Good — the raised texture picks up the accent's sheen for the active row only -->
<div class="data-[active=true]:[--color-raised-pattern:var(--color-accent-pattern)]">…</div>
```

- **A genuinely new neutral role costs a value in every station × mode**, hand-authored in
  `src/styles/stations.css`, plus its `@theme` declaration in `src/styles/main.css`. Add one only
  when the colour is a distinct question every station must answer — not when three call sites happen
  to share a shade.
- **Name a role for the job it does, never for its colour or its first caller** — `line`, not
  `brown-300`; `skeleton-sheen`, not `tip-card-shimmer`.
- **A colour that must stay identical across stations is a fixed role, not a station role** — declare
  it once in `@theme` with a `data-mode='dark'` counterpart ([[surface-stations]] holds which roles
  are fixed and why each opts out).
