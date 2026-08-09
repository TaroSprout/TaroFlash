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
- **The scroll-bar hangs in the card's own horizontal padding** (`-right-8`
  against a `--dialog-px` of 1.5–2rem), so the body has to sit in the content
  column rather than break out of it — moving the body out from under the card's
  padding orphans the scroll-bar's positioning.

> [!HAZARD] [K:dialog-card-overflow-bleed] **`overflow_bleed` widens the clip boundary without moving the slotted content.**
> `overflow-y-auto` clips the x-axis too, so corner-overhang content (an
> absolutely positioned menu or tick sitting a few px outside a grid cell) gets
> cut off. `overflow_bleed` adds matching padding plus a negative margin on the
> scrolling content div — the clip boundary widens into the surrounding
> `--dialog-px` gutter while the slotted content's own visible position doesn't
> move. It's horizontal only: the top edge isn't clipped, and bleeding it too
> could collide with a header.

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
