---
lastUpdated: 2026-07-10T17:37:36Z
---

# Colors & Palette

Component themes are typed as `MemberTheme` (defined in `types/member.d.ts`). Each value maps to a block in `src/styles/palettes.css` that defines the `--theme-*` tokens for that color.

## Available themes

`blue-500` is the default (used by `:root` when no `data-theme` is set).

| Value        | Primary color |
| ------------ | ------------- |
| `blue-500`   | Blue 500      |
| `blue-900`   | Blue 900      |
| `blue-800`   | Blue 800      |
| `blue-650`   | Blue 650      |
| `blue-400`   | Blue 400      |
| `stone-900`  | Stone 900     |
| `stone-700`  | Stone 700     |
| `green-800`  | Green 800     |
| `green-600`  | Green 600     |
| `green-500`  | Green 500     |
| `green-400`  | Green 400     |
| `green-300`  | Green 300     |
| `green-200`  | Green 200     |
| `purple-700` | Purple 700    |
| `purple-500` | Purple 500    |
| `purple-400` | Purple 400    |
| `purple-200` | Purple 200    |
| `pink-700`   | Pink 700      |
| `pink-500`   | Pink 500      |
| `pink-400`   | Pink 400      |
| `red-600`    | Red 600       |
| `red-500`    | Red 500       |
| `red-400`    | Red 400       |
| `red-300`    | Red 300       |
| `orange-700` | Orange 700    |
| `orange-500` | Orange 500    |
| `yellow-700` | Yellow 700    |
| `yellow-500` | Yellow 500    |
| `yellow-400` | Yellow 400    |
| `brown-800`  | Brown 800     |
| `brown-700`  | Brown 700     |
| `brown-500`  | Brown 500     |
| `brown-300`  | Brown 300     |
| `brown-200`  | Brown 200     |
| `brown-100`  | Brown 100     |
| `brown-50`   | Brown 50      |
| `grey-900`   | Grey 900      |
| `grey-800`   | Grey 800      |
| `grey-700`   | Grey 700      |
| `grey-500`   | Grey 500      |
| `grey-400`   | Grey 400      |
| `grey-300`   | Grey 300      |
| `white`      | White         |
| `black`      | Black         |

## Base color tokens

The raw color palette is defined in `src/styles/main.css` (inside the `@theme` block) and exposed as `--color-*` tokens. Use these only for colors that do not change with the component theme. For anything that should follow the active theme, use `--theme-*` tokens instead — see [Theming](./theming.md).

Current token families and shades:

| Family   | Shades                           |
| -------- | -------------------------------- |
| `blue`   | 900, 800, 650, 500, 400          |
| `stone`  | 900, 700                         |
| `green`  | 800, 600, 500, 400, 300, 200     |
| `purple` | 700, 500, 400, 200               |
| `pink`   | 700, 500, 400                    |
| `red`    | 600, 500, 400, 300               |
| `orange` | 700, 500                         |
| `yellow` | 700, 500, 400                    |
| `brown`  | 800, 700, 500, 300, 200, 100, 50 |
| `grey`   | 900, 800, 700, 500, 400, 300     |
| —        | `white`, `black`                 |

## Dark mode

All `MemberTheme` values support dark mode via `data-theme-dark`. When the root has `data-theme="dark"`, a component with `:data-theme-dark="'purple-500'"` will use the `purple-500` palette regardless of its `data-theme` value. See [Theming](./theming.md) for details.
