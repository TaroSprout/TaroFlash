---
id: scroll-lock
domain: ui
status: current
hazard: true
related: [scroll-region]
updated: 2026-08-16
---

# Locking background scroll without touching layout

`useScrollLock` (`src/composables/ui/scroll-lock.ts`) keeps the page behind an
open modal from scrolling, without the usual `overflow: hidden` /
`position: fixed` toggle on `<html>`/`<body>`.

> [!HAZARD] [K:scroll-lock-teleport-opt-in] **A teleported panel's own scroller goes silently dead.**
> The lock only recognises the modal's own container as "still allowed to scroll" — a popover
> teleported to `<body>`, as Vue's `<Teleport>` does, renders outside it. Its scroll area shows a
> scrollbar and does nothing: no error, no console warning, just a wheel that stops working. It has
> to opt back in with `data-scroll-live` on its own scrolling area.
> [See how the opt-in works ↓](#a-teleported-panel-has-to-opt-back-in)

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

## A teleported panel has to opt back in

The lock decides what counts as "the modal" by DOM containment — is this element inside the
container ref it was handed? A popover, dropdown, or editor panel that teleports to `<body>` (so it
can escape a clipping ancestor) breaks that containment on purpose, which means it also breaks out of
the one subtree still allowed to scroll.

A teleported panel's scrolling area sets `data-scroll-live` on itself. The lock treats that attribute
as a second live root, exactly like the modal's own container — the scroller is then looked up
_inside_ that root, scroll stops at its edges, and it chains through to the page the same way.

Because the attribute names a root rather than the scrolling element itself, it goes on whichever box
the panel builds its scroll area from: a raw `overflow-y-auto` element, or the
[[scroll-region]] wrapping one, which owns the scrolling element a level down. Nothing wires this
automatically; it's opt-in per scroll area, so a new teleported panel with its own internal scrolling
needs the attribute the moment it's added, not after someone notices the wheel does nothing.

## Related

[[scroll-region]]
