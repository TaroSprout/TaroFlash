---
lastUpdated: 2026-05-06T00:00:00Z
paths:
  - 'src/**/*.vue'
---

# CSS in Vue files

**Default to Tailwind utility classes in the template.** Don't open a `<style>` block unless one of these conditions clearly applies:

- **Extremely large class blocks** — the inline list is so long it hurts readability and structure.
- **Duplicated classes across multiple elements** — the same set repeats on siblings or across the file.
- **Complex state management** — selectors like `:hover`/`:focus`/`:disabled` chains, sibling/descendant selectors, pseudo-elements, or animations that don't map cleanly to utility variants.

When you do reach for a `<style>` block:

- Write plain CSS with `var(--theme-*)` / `var(--color-*)` tokens — never `@apply`.
- Keep the rule scoped to the component; don't leak global selectors.

If none of the conditions apply, keep it inline — even when the class list looks long, utilities beat a one-off style block.

## Tailwind's default theme is disabled

`src/styles/main.css` declares `--*: initial`, which wipes Tailwind's built-in theme. **Only tokens explicitly defined under `@theme` exist** — check `main.css` before reaching for a utility rather than assuming the default scale is there. Common gaps: most `-200`/`-400`/`-600` colour shades, and the radius scale, which is custom (`rounded-2_5`, `rounded-3_25`). Base spacing unit is 4px.

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

Any container that clips overflow — height/crossfade transitions, `overflow-hidden` swap wrappers — carries **no padding of its own**. Define the padding as a CSS var on an owning parent and have the slotted children apply it (`px-(--window-px)`, `px-(--dock-px)`).

The app leans on outlines and shadows that overflow their element boxes; if the clipping container holds the padding, those get cut off at its edge mid-tween. Insetting the children instead leaves the overflow room to render.

## Shaped edges

`src/styles/border-utils.css` defines `wave-bottom-[<length>]`, `wave-top-[<length>]` and `cloud-bottom-[<length>]` — CSS masks that carve a shaped edge. Use them; don't hand-roll SVG.
