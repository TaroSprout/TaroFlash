---
id: safe-area-chrome-detection
domain: ui
status: current
hazard: false
related: [keyboard-detection]
updated: 2026-08-08
---

# Detecting whether browser chrome already covers the safe area

A fixed-bottom element (a dock, a footer) needs the device's safe-area inset
added underneath it only when nothing else is already covering that strip.
`installSafeAreaPadding` (`src/composables/ui/safe-area.ts`) decides that live
rather than hard-coding it per browser.

## The gap between the layout and visual viewport is the live signal [K:safe-area-viewport-gap-signal]

Different browsers cover the bottom safe-area strip differently: an
auto-hiding Chrome toolbar, a standalone PWA, or Safari with its tab bar moved
to the top all leave content flush against the literal screen edge, while
Safari's default translucent bottom bar already provides its own buffer. A
hard-coded table of "this browser/mode needs padding" breaks the moment a
vendor changes its chrome behaviour.

Instead the composable measures it live: the layout viewport
(`window.innerHeight`) holds steady while chrome is docked over content, but
the _visual_ viewport shrinks to make room for that chrome. A gap between the
two means chrome is currently covering the bottom strip and no extra padding
is needed; no gap means the app has to supply its own via
`env(safe-area-inset-bottom)`.
