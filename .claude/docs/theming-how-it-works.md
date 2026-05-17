# How theming works

Colors are applied via the `data-theme` attribute, which scopes a set of semantic CSS variables defined in `src/styles/palettes.css`.

1. Parents apply theming by setting `data-theme` (and optionally `data-theme-dark`) directly on the element or component — the value is a `MemberTheme` (e.g. `'blue-500'`, `'green-400'`).
2. On a component, those attributes flow through to its root element via Vue's normal attribute inheritance. Components do **not** declare a `theme` / `themeDark` prop; they just let the attrs forward.
3. `palettes.css` maps each theme value to a set of `--theme-*` variables using a comma selector covering two activation conditions:
   - `[data-theme='X']` — `(0,1,0)` always active (light or dark mode)
   - `[data-theme='dark'] [data-theme-dark='X']` — `(0,2,0)` active when the root is dark
     Each selector in a comma list keeps its own specificity (unlike `:is()`, which elevates all arms to the highest), so the descendant form genuinely beats the plain form in dark mode.
4. Available tokens: `--theme-primary` / `--theme-on-primary`, `--theme-secondary` / `--theme-on-secondary`, `--theme-accent` / `--theme-on-accent`, `--theme-neutral` / `--theme-on-neutral`.
5. Child elements reference those variables via Tailwind's arbitrary-property syntax or plain CSS.

> **Dark mode root**: `use-theme` always writes an explicit `'light'` or `'dark'` to `data-theme` on `document.documentElement` — even when the user's preference is `'system'`. CSS never needs a `prefers-color-scheme` media-query fallback.
