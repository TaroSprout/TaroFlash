# Semantic surface tokens

Recurring brown/grey pairs (`bg-brown-100 dark:bg-grey-700`, etc.) that mark a particular _surface role_ — input controls, page chrome, elevated cards — are defined as semantic tokens at `@theme` and overridden in the dark block in `src/styles/main.css`. Use the semantic class everywhere:

```css
/* main.css */
@theme {
  --color-input: var(
    --color-brown-100
  ); /* form-control surface (inputs, spinbox row, toggle off-track) */
}

@layer base {
  &:where([data-theme='dark'], [data-theme='dark'] *) {
    --color-input: var(--color-grey-700);
  }
}
```

```vue
<!-- Good -->
<div class="bg-input">…</div>

<!-- Bad — duplicates the dark mapping at every callsite -->
<div class="bg-brown-100 dark:bg-grey-700">…</div>
```

When you find yourself writing the same `bg-X dark:bg-Y` pair (or `text-`, `ring-`, etc.) in ≥ 3 places, promote it to a semantic `--color-*` token. Name the token after the role (`input`, `surface`, `elevated`), not the colour (`brown-100`). Themed variants (`--theme-primary`) stay separate — semantic surface tokens are for non-themed chrome.
