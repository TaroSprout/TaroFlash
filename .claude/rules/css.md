---
lastUpdated: 2026-08-28T23:00:23Z
paths:
  - 'src/**/*.vue'
---

# CSS in Vue files

**Owns whether a `<style>` block is warranted, and what it may contain once opened.** Reaches you
editing any `.vue` file.

**Default to Tailwind utility classes in the template.** Don't open a `<style>` block unless one of these conditions clearly applies:

- **Extremely large class blocks** — the inline list is so long it hurts readability and structure.
- **Duplicated classes across multiple elements** — the same set repeats on siblings or across the file.
- **Complex state management** — selectors like `:hover`/`:focus`/`:disabled` chains, sibling/descendant selectors, pseudo-elements, or animations that don't map cleanly to utility variants.

When you do reach for a `<style>` block:

- Write plain CSS with `var(--color-*)` role tokens — never `@apply`, never a raw shade
  ([`theming`](./theming.md) owns which role).
- Keep the rule scoped to the component; don't leak global selectors.

If none of the conditions apply, keep it inline — even when the class list looks long, utilities beat a one-off style block.

## Tailwind's default theme is disabled

`src/styles/main.css` declares `--*: initial`, which wipes Tailwind's built-in theme. **Only tokens explicitly defined under `@theme` exist** — check `main.css` before reaching for a utility rather than assuming the default scale is there. Common gaps: most `-200`/`-400`/`-600` colour shades, and the radius scale, which is custom (`rounded-2_5`, `rounded-3_25`). Base spacing unit is 4px.

**Never hand-convert a Tailwind token (`rounded-N`, `p-N`, `gap-N`, …) to `rem` or `px`.** `main.css`
sets `html { font-size: var(--text-base) }`, which is 14px, not the browser's 16px default — the
usual `N × 0.25rem` or `N × 4px` mental math is wrong here in both units. Use the utility class, or
the CSS var it resolves to (`--spacing(N)`), never a literal length you derived by hand.

## Type sizing

`text-base` is the floor for anything a user reads — body copy, descriptions, labels, metadata, captions. Scale hierarchy _upward_ (`text-lg`, `text-xl`), never below base. Only genuinely trivial subtext (a version number, a build hash) may go smaller.

**Inputs must never go below `text-base` (16px)** — mobile Safari auto-zooms the viewport when focusing a field with smaller text, which yanks the layout around mid-form.

## Disabled states

Drop `cursor-pointer` and the hover affordances for the disabled branch and let the cursor fall back to default. **Never set `cursor-not-allowed`** — reduced opacity already signals the state.

```html
<!-- Good -->
:class="disabled ? 'opacity-50' : 'cursor-pointer hover:…'"
```

## Clipping containers stay full-bleed

One instance of "A class can bind its host to a contract" below: `overflow-hidden`'s clip is the
contract, and the padding it would collide with is what moves off the host.

Any container that clips overflow — height/crossfade transitions, `overflow-hidden` swap wrappers — carries **no padding of its own**. Define the padding as a CSS var on an owning parent and have the slotted children apply it (`px-(--window-px)`, `px-(--dock-px)`).

The app leans on outlines and shadows that overflow their element boxes; if the clipping container holds the padding, those get cut off at its edge mid-tween. Insetting the children instead leaves the overflow room to render.

## A caller's class doesn't beat the component's own

A component's root `class` merges with a caller's, but stylesheet order — not the merge — decides
which utility wins. **This holds however the component's declaration is written** — a hardcoded
utility in the template (`class="relative"`) and a same-specificity rule in its own `<style>` block
(`.some-root { position: relative }`) both beat a caller's override on that same root exactly the
same way; neither form is safer than the other. `position` is the property that bites hardest,
because it's also the property most callers pass in to place the component (`absolute`, `fixed`) —
but the same cascade-order trap applies to any property a caller might reasonably expect to override
(a fixed `w-*`, `z-*`, `overflow`). Never let the component's root itself declare a property a caller
is meant to override, from either source; give the component an inner element to carry that
property, leaving the root free.

## Shaped edges

`src/styles/border-utils.css` defines `wave-bottom-[<length>]`, `wave-top-[<length>]` and `cloud-bottom-[<length>]` — CSS masks that carve a shaped edge. Use them; don't hand-roll SVG.

## A class can bind its host to a contract

Any class — stock Tailwind or a hand-rolled `@utility` in `src/styles/*.css` — can claim the element
it lands on for a contract of its own: a positioning context it depends on, an `overflow` it sets and
therefore clips, a stacking context, a fill it expects to own. `overflow-hidden` is stock and imposes
exactly this ("Clipping containers stay full-bleed" above); a custom utility does too, and the way to
find out is to read its own definition in `src/styles/*.css` — the header comment when the file has
one (`shimmer.css`), the ruleset itself when it doesn't (`bg-utils.css` sets `position: relative` and
`isolation: isolate` on `bgx-*`'s host with no header at all). Whatever the contract collides with on
that host — padding, a fill, a caller's position override — moves to a child or a parent instead of
being fought on the host itself, including a child that overhangs the host's own bounds.
[`theming/bgx`](./theming/bgx.md) is the other instance, for `bgx-*`'s stacking.
