---
lastUpdated: 2026-06-14T00:00:00Z
paths:
  - 'src/views/**/*.vue'
---

# Skeleton Loading

## Structure

Every view with a loading state gets a colocated `skeleton.vue`. Two tiers:

- **Page skeleton** (`views/deck/skeleton.vue`) — public face. Composed entirely from sub-skeletons; zero hand-rolled placeholder divs. This is the only file `authenticated.vue` ever imports.
- **Sub-skeletons** (`deck-hero/skeleton.vue`, `card-grid/skeleton.vue`, etc.) — private building blocks. Used by the page skeleton and by the view itself for data-level loading. Nothing outside the view's directory imports these directly.

## Switching

Views do a **top-level `v-if` between `<x-skeleton />` and the real content** — the skeleton fully replaces the UI, never instruments through it:

```html
<deck-skeleton v-if="show_skeleton" />
<section v-else ...>
  <!-- real content -->
</section>
```

The same `show_skeleton` computed drives every skeleton state in the view — no per-element guards scattered through the real layout.

## Drift prevention

- **Layout invariants** shared between real UI and skeleton (column formula, gap, breakpoints) live in a composable — both consume it, neither copies it.
- Sub-skeletons must be **injection-safe**: use a nullable inject with a sensible fallback so they render correctly both inside a provided context and standalone in the Suspense window.
- The Suspense fallback (`authenticated.vue`) and the mounted view's data-loading state render the **same page skeleton component** — identical by construction, can't drift.

## Side effects

The page skeleton owns any loading-window side effects via `onMounted`/`onUnmounted`:

```ts
onMounted(() => (document.documentElement.style.overflow = 'hidden'))
onUnmounted(() => (document.documentElement.style.overflow = ''))
```
