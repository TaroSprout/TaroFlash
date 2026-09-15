---
lastUpdated: 2026-08-28T23:00:23Z
paths:
  - 'src/**/*.vue'
---

# CSS in Vue files

**Owns whether a `<style>` block is warranted, and what it may contain once opened.** Reaches you
editing any `.vue` file.

**Default to Tailwind utility classes in the template.** Don't open a `<style>` block unless one of
these conditions clearly applies:

- **Duplicated classes across multiple elements** — the same set repeats on siblings or across the
  file.
- **A selector Tailwind can't express as a variant** — a sibling/descendant combinator, a
  pseudo-element, or a multi-state chain (`:hover:not(:disabled)`) with no utility-variant
  equivalent.

When you do reach for a `<style>` block:

- Write plain CSS with `var(--color-*)` role tokens — never `@apply`, never a raw shade
  ([`theming`](./theming.md) owns which role).
- Keep the rule scoped to the component; don't leak global selectors.

## Tailwind's default theme is disabled

- `src/styles/main.css` sets `--*: initial`, wiping Tailwind's built-in theme — only tokens declared
  under `@theme` exist, so check `main.css` before assuming a utility's default scale is there.
- Common gaps: most `-200`/`-400`/`-600` colour shades, and the radius scale, which is custom
  (`rounded-2_5`, `rounded-3_25` instead of Tailwind's defaults).
- Never hand-convert a Tailwind token (`rounded-N`, `p-N`, `gap-N`, …) to `rem` or `px` — use the
  utility class, or the CSS var it resolves to (`--spacing(N)`), never a literal length derived by
  hand.
- The usual `N × 0.25rem` / `N × 4px` math is wrong here: base spacing is 4px, but `main.css` sets
  the root font-size to `--text-base` (14px), not the browser's 16px default.

## Type sizing

- `text-base` is the floor for anything a user reads (body copy, descriptions, labels, metadata,
  captions) — scale hierarchy upward (`text-lg`, `text-xl`), never below base.
- Only genuinely trivial subtext (a version number, a build hash) may go smaller than `text-base`.
- **Inputs must never go below `text-base` (16px)** — mobile Safari auto-zooms the viewport when
  focusing a smaller field, yanking the layout mid-form.

## Disabled states

- Drop `cursor-pointer` and the hover affordances for the disabled branch — let the cursor fall back
  to default.
- **Never set `cursor-not-allowed`** — reduced opacity already signals the state.

## Clipping containers stay full-bleed

- A container that clips overflow (`overflow-hidden` swap wrappers, height/crossfade transitions)
  carries no padding of its own — define the padding as a CSS var on an owning parent and have
  slotted children apply it (`px-(--window-px)`, `px-(--dock-px)`).
- Inset the children, not the clipping container — outlines and shadows that overflow their box
  otherwise get cut off at the clip edge mid-tween.

## A caller's class doesn't beat the component's own

- A component's root `class` merges with a caller's, but cascade/stylesheet order — not the merge —
  decides which utility wins.
- **`position` bites hardest** — it's the property callers most often pass in to place a component
  (`absolute`, `fixed`), but the same cascade-order trap catches anything a caller might reasonably
  expect to override (`w-*`, `z-*`, `overflow`).
- Never let a component's root itself declare a property a caller is meant to override — give the
  component an inner element to carry that property, leaving the root free.
  - Bad: a hardcoded template utility (`class="relative"`) on the root, or a same-specificity rule
    in the component's own `<style>` block (`.some-root { position: relative }`) — both beat a
    caller's override on that root the same way.
  - Good: the property moves to an inner element; the root carries none of its own.

## Shaped edges

- `src/styles/border-utils.css` defines `wave-bottom-[<length>]`, `wave-top-[<length>]`, and
  `cloud-bottom-[<length>]` (CSS masks that carve a shaped edge) — use them, don't hand-roll SVG.

## A class can bind its host to a contract

- A class landing on a component's root — stock Tailwind or a hand-rolled `@utility` in
  `src/styles/*.css` — can bind that host to a contract: a positioning context, an `overflow` it
  clips, a stacking context, or a fill it expects to own.
- Move whatever collides with the host's contract to a child or parent instead of fighting it on the
  host itself — including a child that overhangs the host's own bounds.
- Read a custom utility's own definition in `src/styles/*.css` before assuming it's inert — the
  header comment when the file has one (`shimmer.css`), the ruleset itself when it doesn't
  (`bg-utils.css` sets `position: relative` and `isolation: isolate` on `bgx-*`'s host with none).
- `overflow-hidden`'s clip is one instance of this — see "Clipping containers stay full-bleed" above.
- [`theming/bgx`](./theming/bgx.md)'s stacking context on `bgx-*`'s host is the other instance.
