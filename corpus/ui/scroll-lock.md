---
id: scroll-lock
domain: ui
status: current
hazard: false
related: []
updated: 2026-08-08
---

# Locking background scroll without touching layout

`useScrollLock` (`src/composables/ui/scroll-lock.ts`) keeps the page behind an
open modal from scrolling, without the usual `overflow: hidden` /
`position: fixed` toggle on `<html>`/`<body>`.

## Layout-based scroll locks visibly move the page on iOS Safari [K:scroll-lock-no-layout-mutation]

Toggling `overflow` or `position` on the document root to lock scroll snaps
the page back to scroll position 0 on iOS Safari, and any layout shift that
causes is visible the moment the overlay above it is even slightly
transparent. Instead of touching layout at all, this composable cancels the
scroll-producing events themselves — `wheel` and `touchmove` — for anything
outside the modal's own container, leaving the page's scroll position and
layout completely untouched.

Scrolling inside the container still works, but only up to its own edges: once
an inner scroller is already at the top or bottom and the gesture keeps
pushing past it, the event is cancelled too — so the gesture never chains
through to the page underneath.
