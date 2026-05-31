---
lastUpdated: 2026-05-17T00:00:00Z
paths:
  - 'src/**/*.{vue,css}'
---

# Theming

Colors go through the `data-theme` token layer — never raw hex, never hardcoded Tailwind color classes (`bg-blue-500`) for themeable colors.

## Top-level rules

- **Always** write styles using tailwind classes; only opt for a `<style>` block when styling becomes complex or oversized for inline classes.
- Set `data-theme` (and `data-theme-dark` when needed) on the outermost element/component that should carry the theme — descendants inherit the tokens.
- Don't add `theme` / `themeDark` props to components — let `data-theme` / `data-theme-dark` forward via `inheritAttrs`. Exception: content teleported out of the DOM (e.g. `ui-kit/tooltip`'s popover) can't inherit, so it takes explicit `theme` / `theme_dark` props.
- Use `--theme-*` tokens only for colors that should signal the active theme. For base chrome use the static brown/grey palette utilities, not `--theme-*`.
- Never use `@apply` — write plain CSS with `var(--theme-*)` directly (see [`css`](./css.md)).

## Deeper reading

- [`theming-how-it-works`](../docs/theming-how-it-works.md) — `palettes.css` selector mechanics + dark-mode root
- [`theming-usage`](../docs/theming-usage.md) — call-site, inside-component, CSS examples
- [`theming-when-to-theme`](../docs/theming-when-to-theme.md) — themed tokens vs base palette decision rule
- [`theming-semantic-tokens`](../docs/theming-semantic-tokens.md) — promoting recurring brown/grey pairs to `--color-*` roles
- [`theming-bgx`](../docs/theming-bgx.md) — textured-background `bgx-*` utilities
