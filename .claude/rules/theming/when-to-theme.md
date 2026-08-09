# When to theme vs use base palette

Not every color should follow the active theme. Reserve `--theme-*` tokens for elements that genuinely need to signal the active theme — primary CTAs, active selections, accents, themed surfaces inside a deck cover. Base UI chrome — body labels, toggle/spinbox idle states, section headings, generic backgrounds, helper text — should use the static brown/grey palette (e.g. `text-brown-700 dark:text-brown-100`, `bg-brown-100 dark:bg-grey-700`) so the chrome stays calm and consistent regardless of which theme is active around it.

Rule of thumb:

- **Themed**: the _active_ / _checked_ / _selected_ state of an interactive element, primary buttons, accent borders, themed cover surfaces.
- **Base palette**: labels, idle/off states, section headings, modal chrome, dividers, generic surfaces.

Mixing is normal in one component — e.g. a toggle's label and off-track stay base palette, while the on-track and on-handle pick up `--theme-primary` / `--theme-on-primary`.
