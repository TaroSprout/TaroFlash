---
lastUpdated: 2026-08-15T00:00:00Z
paths:
  - 'src/**/*.{vue,css}'
---

# Theming

**Owns the colour-role contract** — the three switches (`data-mode`, `data-palette`, `data-station`),
the `--color-*` roles they fill, and when a colour follows the member's palette vs. stays neutral.
Reaches you editing any `.vue` or `.css` file. The model behind it is corpus fact ([[theming]]).

## Top-level rules

- **Ask for a role, never a shade.** `bg-surface`, `text-ink`, `border-line`, `bg-(--color-accent)` —
  never a raw hex, and never a `bg-brown-100 dark:bg-grey-900` pair for a colour a role already
  answers. A role is already correct in both modes, so the `dark:` variant is the tell that you
  reached past the layer.
- **A misspelled role renders bare, not red.** The colour set is closed, so `bg-surfce` produces no
  colour and no warning — confirm a token exists under `@theme` in `src/styles/main.css` before you
  ship a utility you haven't seen elsewhere ([`css`](./css.md) owns the reset that causes this).
- **Never write `data-mode` from a component.** `src/stores/theme.ts` is its only writer; read the
  rendition by using a role, or branch on the `dark:` variant for a non-colour property.
- **`data-palette` opts one element in, on its own root.** Attributes don't inherit, so putting it on
  an ancestor colours nothing below it →[K:theming-palette-identity].
- **Put `data-station` on the element that owns the surface, and pair it with `bg-surface`** —
  [`stations`](./theming/stations.md) holds that pairing.
- Whether a `<style>` block is warranted at all, and the plain-CSS-not-`@apply` rule once you're in
  one, are [`css`](./css.md)'s.

## Spokes

- [`how-it-works`](./theming/how-it-works.md) — where each role is authored, and the generated stylesheet
- [`usage`](./theming/usage.md) — call-site, inside-component, teleport and CSS syntax
- [`when-to-theme`](./theming/when-to-theme.md) — accent role vs. neutral station role
- [`semantic-tokens`](./theming/semantic-tokens.md) — adding a role vs. remapping one locally
- [`bgx`](./theming/bgx.md) — textured-background `bgx-*` utilities and their two fill roles
- [`stations`](./theming/stations.md) — which background class pairs with a `data-station` root
