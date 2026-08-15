---
lastUpdated: 2026-08-15T00:00:00Z
paths:
  - 'src/**/*.{vue,css}'
---

# Where a role is authored

**Owns which file you edit to change what a role resolves to, per switch.**

- **Accent roles come from the registry, not the stylesheet.** Change `--color-accent`,
  `--color-accent-muted`, `--color-on-accent` or `--color-accent-text` for a palette in
  `src/utils/palette/registry.ts`, then run `pnpm gen:palette-css`. `src/styles/palettes.gen.css` is
  generated — an edit there is overwritten by the next run and never reaches
  `src/utils/cover/tokens.ts`, which must list the same palette set.
- **Neutral roles are authored per station, by hand, in `src/styles/stations.css`** — light and dark
  renditions both, with nothing derived from another station →[K:surface-stations-hand-authored].
  Changing one station's value is not a signal to recompute the other three.
- **A role only becomes a Tailwind utility once it is declared under `@theme` in
  `src/styles/main.css`.** Adding a value in `stations.css` alone gives you a variable that
  `var()` reads but `bg-*` / `text-*` / `border-*` never resolve.
- **A new palette alias joins the selector list of the palette it points at**, so `danger` and `red`
  stay one rendition — never a second block copying the values.
- **Never gate a dark rendition on `prefers-color-scheme`.** The theme store always writes an
  explicit `data-mode` to `documentElement`, including for the `system` preference, so a media query
  is a second source of truth that disagrees the moment a member overrides the system.
- **Scope a dark override with both the descendant and the self form** —
  `[data-mode='dark'] [data-palette='x']` and `[data-mode='dark'][data-palette='x']` — or the role
  breaks whenever the attribute lands on the moded root itself rather than below it.
