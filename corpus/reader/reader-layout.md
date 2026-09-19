---
id: reader-layout
domain: reader
status: current
hazard: true
related: [[reader-selection]]
updated: 2026-09-18
---

# Reader layout: measuring pages off-screen

The reader never lays out a book by rendering its pages and seeing what fits.
It builds an invisible, unmounted copy of the words first, measures that, and
only then hands real pages the numbers they need.

> [!HAZARD] [K:book-measure-chunks-and-unmounts] **The off-screen word measurer renders its paragraphs in budgeted chunks across animation frames, then unmounts every word it just measured the moment it finishes.**
> `useBookMeasure` walks the book `WORDS_PER_FRAME` words at a time — each
> `requestAnimationFrame` tick renders one more chunk into a hidden host,
> reads back each word's position with `getBoundingClientRect`, then advances.
> `finalize()` drops `rendered_count` back to 0 once the whole book is
> measured, unmounting the per-word DOM it no longer needs. The flip side:
> this is still `O(book)` wall-clock time, paid once per resize or content
> change — an accepted, budgeted cost (reader epic #461 GO), not a defect to
> fix by measuring less.

> [!HAZARD] [K:resize-freeze-gates-frame-height] **The reference frames' height tracks the live viewport even while a resize is "frozen" — the freeze gates width, not height.**
> `useResizeFreeze` sets `frozen` the instant a resize begins and clears it
> only once the settle animation finishes, and both motion modes — the real
> freeze-then-scale tween and the reduced-motion no-op — bracket the drag
> with it identically, so `frozen` is a reliable signal either way. But the
> measurement frames (`reader__frame-reduced`, `reader__frame-full` in
> `src/views/reader/index.vue`) are positioned `absolute inset-y-0`, so their
> _height_ keeps tracking the viewport for the whole drag regardless of
> `frozen`. Only `onFrameResize` — the caller that turns a frame resize into a
> reflow — checks `frozen` before acting. Anything else reacting to those
> frames' size has to gate on `frozen` itself; the frame's own geometry won't
> tell you the drag is still in flight.

## The measure pass is a dry run for the real pages

`useBookMeasure` renders the same paragraph markup a real page shows, but
inside `book-measure.vue` — `aria-hidden`, `pointer-events-none`,
`data-perf-ignore` on its scaffold root, positioned off-screen. Nothing about
it is meant to be seen; it exists purely so `getBoundingClientRect` has real
laid-out geometry to read. `usePagination` (downstream) turns that geometry —
each word's top/bottom, each translation band's height — into page
boundaries the real, visible pages then just slice into.

## Resize freezes the surface, not the layout math underneath

`useResizeFreeze` exists so a drag-resize doesn't restart the whole measure
pass on every intermediate frame. While `frozen` is true the visible surface
is scaled with a CSS transform to fake the new size; the real reflow —
remeasuring frame heights, re-running pagination — only happens once the
drag settles (`SETTLE_MS` after the last resize event). `onFrameResize`
bailing while `frozen.value` is what makes that hold.

## What this isn't

Not a rule about `ResizeObserver` usage in general — the hazard is specific
to these two composables' shared assumption that "frozen" fully describes
what's safe to ignore during a resize. It doesn't; only the reflow path
checks it.
