---
id: scroll-region
domain: ui
status: current
hazard: true
related: [layout-kit]
updated: 2026-08-16
---

# The scroll region owns its scrollbar

`layout-kit/scroll-region` is the primitive that owns a scrolling box and the
handle beside it. `ui-kit/scroll-bar.vue` used to measure itself and draw the
handle; now it's a dumb presentational strip — `scroll-region` measures the
scrolling box and the handle just renders whatever numbers it's handed.

> [!HAZARD] [K:scroll-region-hidden-host-measures-zero] **A scroll region measured while its host sits behind `display: none` reads a track and content height of 0.**
> A tab panel, a collapsed accordion, a modal not yet shown — any of them hide
> their contents this way, and a one-time measurement taken on mount lands
> before the host is ever revealed. Both the track and the scrolled element
> get sized by `ResizeObserver` instead of a single read on mount, because the
> observer fires again the moment the host is shown and its size stops being
> zero.

> [!HAZARD] [K:mid-gesture-mutation-kills-momentum-scroll] **Rewriting the `class` or an attribute on a scrolling box while a touch gesture is in flight kills iOS momentum scroll.**
> Every state a scrolling box switches between has to be expressible in CSS
> alone — a data attribute set once at mount, or a variable a selector reads —
> never a class Vue re-patches on every render. `scroll-region`'s own
> `--scroll-overflow` switch, `app-window`'s body scroller, and the
> mobile-modal docking variant all lean on this to change scroll behaviour
> without ever touching the scrolling element's own attributes mid-gesture.

> [!HAZARD] [K:page-boxes-are-height-pinned] **`html`, `body` and `#app` are all pinned to the viewport height, so nothing about page height can be read off their size.**
> `index.html` gives all three `class="h-full"` — a `ResizeObserver` watching
> any of them only ever fires on viewport resize, never when a route swaps in
> taller content. Page-mode scroll measurement (`use-scroll-metrics`'s
> `attachPage`) watches `document.body` with a `MutationObserver` instead.

## What this isn't

Not a claim that `display: none` itself is the thing to avoid — hiding
content that way is normal and fine. The trap is measuring it once instead of
watching it, which any consumer building its own scroll-position UI on top of
a hideable host should keep in mind.

## Related

[[layout-kit]]
