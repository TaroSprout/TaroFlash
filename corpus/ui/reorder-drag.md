---
id: reorder-drag
domain: ui
status: current
hazard: false
related: []
updated: 2026-08-08
---

# Drag-to-reorder

The pointer-driven engine behind dragging a row or card to a new spot in a list
or grid (`src/composables/use-reorder-drag.ts`). It never moves or clones DOM —
the caller applies a computed offset to each row as a `translate`, so it can
coexist with a virtualizer.

## Auto-scroll ramps the longer the pointer dwells at an edge [K:reorder-drag-edge-scroll-ramp]

Dragging a row to the top or bottom edge of the viewport scrolls the page, and
that scroll speeds up the longer the pointer stays there — three tiers, keyed
off how long the current dwell has lasted (0ms / 450ms / 2000ms → 16 / 36 / 64
px per frame). A drag that clips the edge briefly nudges the page; one that
lingers accelerates, so a long list is still reachable without capping the top
speed for everyone.

The scroll ceiling is read fresh each frame from `maxScroll()` when the caller
supplies it, rather than the DOM's live `scrollHeight` — a dragged row counts
toward scrollable overflow in some browsers while it's translated, so reading
the live value mid-drag would let auto-scroll chase its own tail past the real
content.

## The drop target only flips past a hysteresis margin [K:reorder-drag-hysteresis]

The live "drop here" slot doesn't track the pointer's ideal position 1:1 — it
only advances once the ideal position has crossed half a slot _plus_ a 0.15
margin, and needs to cross back past that same margin to reverse. Without the
margin, hovering exactly on a slot boundary flips the target back and forth on
sub-pixel jitter, firing the crossing sound every frame.

## A slot's neighbour-to-neighbour gap doubles as the grid-wrap vector [K:reorder-drag-gap-shift]

The offset applied to a row the drag has passed is the geometric vector between
two adjacent slots' resting positions, not a fixed row height. On a grid this
happens to wrap for free: the step from a row's first slot to the previous
row's last slot carries a card up a row and across, with no grid-specific code
in the engine — the same formula that shifts a list item down one row height
shifts a grid item around a wrap.

## Commit and reset land in the same synchronous tick [K:reorder-drag-commit-reset-sync]

Dropping a row calls the caller's `onReorder` (expected to reorder the list
optimistically) and then zeroes the drag offsets in the same tick, so the next
render shows the row already sitting in its new slot with no offset applied —
no snap-back frame between "still at the old position" and "reordered".
