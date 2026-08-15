---
lastUpdated: 2026-05-17T00:00:00Z
paths:
  - 'src/**/*.{vue,css}'
---

# Theming

**Owns the theme token contract** — `data-theme`, `--theme-*` tokens, and when a color should follow
the active theme vs. the static base palette. Reaches you editing any `.vue` or `.css` file.

Colors go through the `data-theme` token layer — never raw hex, never hardcoded Tailwind color classes (`bg-blue-500`) for themeable colors.

## Top-level rules

- Set `data-theme` (and `data-theme-dark` when needed) on the outermost element/component that should carry the theme — descendants inherit the tokens.
- Don't add `theme` / `themeDark` props to components — let `data-theme` / `data-theme-dark` forward via `inheritAttrs`. Exception: content teleported out of the DOM (e.g. `ui-kit/tooltip`'s popover) can't inherit, so it takes explicit `theme` / `theme_dark` props.
- Use `--theme-*` tokens only for colors that should signal the active theme. For base chrome use the static brown/grey palette utilities, not `--theme-*`.
- Whether a `<style>` block is warranted at all, and the plain-CSS-not-`@apply` rule once you're in
  one, are [`css`](./css.md)'s.

## Spokes

- [`how-it-works`](./theming/how-it-works.md) — `palettes.gen.css` selector mechanics + dark-mode root
- [`usage`](./theming/usage.md) — call-site, inside-component, CSS examples
- [`when-to-theme`](./theming/when-to-theme.md) — themed tokens vs base palette decision rule
- [`semantic-tokens`](./theming/semantic-tokens.md) — promoting recurring brown/grey pairs to `--color-*` roles
- [`bgx`](./theming/bgx.md) — textured-background `bgx-*` utilities
- [`stations`](./theming/stations.md) — which background class pairs with a `data-station` root
