---
id: perf-overlay
domain: ui
status: current
hazard: true
related: []
updated: 2026-09-10
---

# The dev perf overlay

A dev-only overlay watches two things while you use the app: how long each frame
takes, and how much of the screen is covered by an expensive standing effect —
something that keeps costing the GPU even while nothing else moves.

> [!HAZARD] [K:perf-scan-no-js-loop-marker] The standing-effect scan only sees
> effects authored as CSS — a `bgx-*` class, a `backdrop-filter`, or a looping
> CSS `animation`. A JS-driven ambient loop (a `requestAnimationFrame` tween
> that repeats, a GSAP timeline set to `repeat: -1`) leaves none of those marks
> on the element, so it never gets counted. The overlay's ratio can read well
> under budget while a JS loop is still burning frames — the fix is to give
> ambient loops a shared marker, not to trust a clean reading as proof there
> are none running.

## Why CSS-only is the state today

Nothing in this codebase currently marks a JS-driven loop as ambient — no
class, no `data-` attribute, no other convention a scan could match against.
`scanPerf()` (`src/utils/motion/perf-scan.ts`) can only look for what's
declared, so it declares a CSS-shaped trap and stops there.

## What this isn't

Not a correctness gate — nothing here blocks a build or a merge. It's a
developer-facing signal, read manually against `PERF_BUDGET`
(`src/utils/motion/perf-budget.ts`).
