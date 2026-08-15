---
lastUpdated: 2026-08-15T00:00:00Z
paths:
  - 'src/**/*.{vue,css}'
---

# Textured backgrounds: `bgx-*`

**Owns the `bgx-*` utilities in `src/styles/bg-utils.css` and which role fills the texture.**

The utility masks a repeating pattern into a `::before` layer behind the element's own background.

| Utility               | What it does                                                 |
| --------------------- | ------------------------------------------------------------ |
| `bgx-<name>`          | Sets the mask image (`bgx-dot-grid`, `bgx-diagonal-stripes`) |
| `bgx-color-(--token)` | Sets the fill colour of the mask layer                       |
| `bgx-opacity-<n>`     | Sets opacity as a percentage (`bgx-opacity-25` → 25%)        |
| `bgx-size-<n>`        | Sets mask-size via the spacing scale, or a length            |
| `bgx-slide`           | Animates the mask horizontally, infinite loop                |
| `bgx-slide-down`      | The same, vertically                                         |
| `pattern-mask`        | The runtime variant — image supplied inline as `--bgx-image` |

## Which role fills it

Two roles exist for this, and they go opposite ways — pick by what the texture sits on, never by
which one looks right in the mode you have open:

- **`--color-accent-pattern` on an accent surface** — a soft sheen over an already-coloured fill.
  This is the default fill, so a bare `bgx-<name>` on a neutral surface is almost always wrong.
- **`--color-raised-pattern` on a neutral surface** — neutral buttons, tap sweeps, chrome dot grids.
  It reads darker than the surface in light and lighter in dark.

```html
<!-- Good — neutral chrome names the neutral texture role -->
<div class="bgx-dot-grid bgx-size-15 bgx-color-(--color-raised-pattern)" />
```

- **Pass a role, never a raw colour**, to `bgx-color-*`. `currentColor` is the one exception, for a
  sweep that must track a text colour already resolved on the element.
- **Use `pattern-mask`, not `bgx-<name>`, when the pattern is chosen at runtime.** The `bgx-*`
  literals must be statically scannable, so a bound pattern name never produces a utility; the
  runtime path sets `--bgx-image` inline instead.
- **Set a per-mode opacity through `--bgx-opacity-light` / `--bgx-opacity-dark` on `pattern-mask`**,
  never inline on `--bgx-opacity` — an inline value outranks the dark-mode selector and freezes the
  light strength into both modes.
