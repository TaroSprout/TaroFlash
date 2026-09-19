---
id: reader-selection
domain: reader
status: current
hazard: true
related: [[reader-layout]]
updated: 2026-09-18
---

# Reader word selection

Tapping or dragging across the reader's text turns a raw pointer gesture into
a committed word range — the mechanism behind picking a word to look up.

> [!HAZARD] [K:selection-click-swallower-is-viewport-wide] **The gesture-click swallower that protects a committed tap listens on `window`, in the capture phase, for the whole page — not just the words it was built to protect.**
> `useWordSelection` (`src/composables/audio-reader/word-selection.ts`) arms
> `suppress_gesture_click` on every committed touch tap, because a touch
> commit is always trailed by a browser compatibility `click` that would
> otherwise land on the just-opened term surface and dismiss it. That
> swallower is registered as `window.addEventListener('click', ..., true)` —
> capture phase, no scoping to the words host — so once armed it eats
> the very next click anywhere in the viewport, including a sibling control's
> click. That's why the reader's transport buttons
> (`src/views/reader/controls.vue`) bind `@pointerup` rather than `@click`:
> a `@click` handler there can be silently swallowed by a selection commit
> that happened moments earlier elsewhere on the page. Any new clickable
> control added inside the reader viewport needs the same treatment — bind
> the interaction event that isn't `click`, or the swallower will eat it on
> exactly the gesture sequence it was written to protect.

## One engine, several gesture shapes

`useWordSelection` is the single engine behind hover, drag-to-select (mouse),
and long-press-then-drag (touch) — see the composable's own doc comment for
the full gesture state machine. What matters at the reader-layout altitude is
just the one side effect that reaches outside the words host: the click
swallow above.

## What this isn't

Not a general rule about click-vs-pointerup preference in this codebase —
this is specific to the reader viewport, where a real mechanism (the
touch-click swallower) makes `@click` unreliable independent of any general
preference.
