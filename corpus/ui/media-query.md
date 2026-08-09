---
id: media-query
domain: ui
status: current
hazard: false
related: []
updated: 2026-08-08
---

# Responsive breakpoint queries

`useMatchMedia` (`src/composables/ui/media-query.ts`) turns a short token string
like `w>=md` or `w<lg | coarse` into a live CSS media query, so a component can
read a responsive condition as a boolean instead of hand-writing `matchMedia`.

## A "below" breakpoint compiles to a negated minimum, not `max-*` [K:media-query-safari-below-as-negated-min]

`w<md` doesn't compile to `(max-width: …)`. It compiles to
`not all and (min-width: …)` — the same form Tailwind's own `max-*` utilities
emit. That form works on every Safari version; the more obvious `max-width`
media feature and the modern bare `not (…)` syntax both have Safari gaps this
sidesteps.

## An AND clause can't carry a "below" atom [K:media-query-and-cant-negate]

`w>=lg & fine` is fine, but `w<lg & fine` throws. A "below" atom's compiled form
already carries its own `not`, and folding a second `not`-carrying clause into
an `and` list would flip every other atom in the list by De Morgan's law, not
just the one being negated. Only `|` (OR) is safe for "below" atoms; a real
width/height band under `&` would need dedicated `max-*` support this file
doesn't have yet.

## iOS Safari's first read of a fresh page can be stale [K:media-query-ios-first-paint-stale]

Right when a page's first script runs, iOS Safari's viewport can still be
settling (zoom level, safe-area insets), so `matchMedia(...).matches` read at
that instant is sometimes wrong. Every cached query re-checks itself once on
the next animation frame and self-corrects if it drifted — a one-frame-late
fix rather than trusting the synchronous read.
