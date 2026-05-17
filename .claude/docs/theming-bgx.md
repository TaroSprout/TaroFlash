# Textured backgrounds: `bgx-*`

`src/styles/bg-utils.css` defines a `bgx-*` utility that composites a masked pattern layer over an element using a `::before` pseudo-element. Use it for decorative texture effects (e.g. diagonal stripes on hover).

Key modifiers:

| Utility               | What it does                                               |
| --------------------- | ---------------------------------------------------------- |
| `bgx-<name>`          | Sets the mask image (e.g. `bgx-diagonal-stripes`)          |
| `bgx-color-[<value>]` | Sets the fill color of the mask layer                      |
| `bgx-opacity-<n>`     | Sets opacity as a percentage (e.g. `bgx-opacity-20` → 20%) |
| `bgx-size-<n>`        | Sets mask-size via spacing scale or length                 |
| `bgx-slide`           | Animates the mask position (infinite loop)                 |

To make the texture color follow the active theme token, pass the token through the arbitrary-value bracket:

```html
<!-- fill inherits the current theme's neutral color -->
<div class="bgx-diagonal-stripes bgx-color-[var(--theme-neutral)]" />

<!-- fill follows the on-neutral token -->
<div class="bgx-diagonal-stripes bgx-color-[var(--theme-on-neutral)]" />
```

When using `bgx-color-*` inside a themed element, always pass a `var(--theme-*)` token, not a raw color.
