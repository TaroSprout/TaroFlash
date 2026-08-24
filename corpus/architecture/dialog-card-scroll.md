---
id: dialog-card
domain: architecture
status: current
hazard: true
related: [layout-kit]
updated: 2026-08-08
---

# Dialog-card layout

How `layout-kit/dialog-card` owns its scrolling body, its toolbar row, and its
content-grid padding, so call sites stop hand-rolling the same things slightly
differently each time.

## The scrolling body

`dialog-card-body.vue` is opt-in: wrap the default slot in it only when the body
can overflow. Once wrapped, two things follow from where it sits:

- **Bottom padding collapses when a `#toolbar` is present.** `--dialog-body-pb`
  comes from the card and drops to 0 once the card has a toolbar row, since that
  row then owns the space above the bottom edge instead. The fallback keeps a
  body rendered outside a `dialog-card` sane.
- **The scroll handle hangs in the scroll region's own `--scroll-gutter`**, not
  a padding value `dialog-card-body.vue` owns itself — the body only sets the
  handle's bottom inset, through `--scroll-track-inset-end`, so it clears
  `--dialog-body-pb` instead of running past the card's bottom edge.

> [!HAZARD] [K:dialog-card-overflow-bleed] **`overflow_bleed` widens the clip boundary without moving the slotted content.**
> `overflow-y-auto` clips the x-axis too, so corner-overhang content (an
> absolutely positioned menu or tick sitting a few px outside a grid cell) gets
> cut off. `overflow_bleed` adds matching padding plus a negative margin on the
> scrolling content div — the clip boundary widens into the surrounding
> `--dialog-px` gutter while the slotted content's own visible position doesn't
> move. It's horizontal only — the top edge is clipped too, by the same
> `overflow-y-auto`, and stays that way: bleeding it vertically would run the
> content under the header sitting right above the scroll region.

## The toolbar slot isn't reactive to read from a computed

> [!HAZARD] [K:dialog-card-toolbar-slot-reactivity] **`slots.toolbar` doesn't trigger reactivity — read it from a plain function called in the template, never a `computed`.**
> A `computed` wrapping `slots.toolbar` caches the first answer and never
> notices a `v-if`'d toolbar appearing or disappearing later. `gridRowsClass()`
> and `bodyPaddingStyle()` on `dialog-card/index.vue` are plain functions called
> straight from the template so they re-run every render instead.

## Grid padding is a literal class, not an arbitrary-value reference

> [!HAZARD] [K:dialog-card-content-grid-padding] **`--content-grid-padding` is set as an inline style, not a `content-grid-px-(--dialog-px)` class.**
> Tailwind's arbitrary-value matcher never generates a rule for a class
> referencing a bare custom property like that — the class silently no-ops, and
> the padding falls back to the content-grid default of 0, so every direct
> child renders flush against the card's edge. Setting the var directly in
> `:style` sidesteps the matcher entirely.

## Related

[[layout-kit]]
