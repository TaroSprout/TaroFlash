---
lastUpdated: 2026-08-08T00:00:00Z
paths:
  - 'src/sfx/**/*'
  - 'src/**/*.vue'
---

# Sound effects

Audio runs through a lightweight custom engine in `src/sfx/`, surfaced as the `v-sfx` directive and the imperative `emitSfx()`.

## Buttons use the `sfx` prop

`UiButton` orchestrates its own click sounds through `useStagedTap`. Pass them as a prop — never call `emitSfx` for a button click, which bypasses the orchestration.

```html
<ui-button :sfx="{ press: 'ui.select' }">…</ui-button>
```

Keys routed through staged-tap: `press`, `tap_pre`, `tap_post`. The directive handles `hover`, `focus`, `blur`.

## A recurring sound lives in its seam

A sound that should play for **every** instance of an action belongs in the single function that performs it — a store action, a mutation, a mode setter — not wired at each call site, where copies drift and double up ([`architecture/api-layer`](./architecture/api-layer.md) states the general rule). The deck mode-switch chime lives in `setMode`, and the per-call-site duplicates were deleted.

`PlayOptions` (`src/sfx/player.ts`) is `{ volume?, debounce?, bus? }` — there is no option that suppresses a follow-on sound. When a caller needs a different cue for the same seam-owned transition, give the seam function an optional sound parameter defaulting to its usual cue (`setMode(mode, chime = 'select')`) and have the caller pass its own — never fire a second sound alongside the seam's.

Centralise only for genuine instances of _that_ action — don't fold in unrelated uses of the same key.

## Options go on the existing call

If a click handler already calls `emitSfx(...)` imperatively, pass options to **that call**. Don't add a parallel `v-sfx="{ click: … }"` next to it — it double-plays and splits the configuration surface, leaving it ambiguous which one carries the options. Leave `v-sfx` to hover/focus/blur on that element.
