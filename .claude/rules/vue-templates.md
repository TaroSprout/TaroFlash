---
lastUpdated: 2026-04-17T01:31:17Z
paths:
  - 'src/**/*.vue'
---

# Vue Template Conventions

**Owns template markup conventions** — `data-testid` coverage and state-attribute naming. Reaches
you editing any `.vue` file's template.

## data-testid attributes

- **Add `data-testid` to every `div`, `section`, `header`, `footer`, `nav`, and `aside` that
  represents a distinct part of new component markup**, named `component-name__section` (e.g.
  `mobile-sheet__body`, `deck-settings__actions`) — [`test-authoring`](./test-authoring.md) queries
  only by `data-testid`, never class names. A purely decorative or `aria-hidden` element (a spacer)
  doesn't need one.

```html
<div data-testid="deck-card">
  <header data-testid="deck-card__header">...</header>
  <div data-testid="deck-card__body">...</div>
  <footer data-testid="deck-card__footer">...</footer>
</div>
```

## `data-active` is the canonical state attr

- **Interactive selection / active state on ui-kit primitives uses `:data-active="<bool>"`** — toggle,
  spinbox pill, align-picker cells, tab-bar tabs, etc. CSS variants hook off it via
  `data-[active=true]:...` / `data-[active=false]:hover:...`; tests assert on
  `attributes('data-active')`.
- **Never introduce a parallel attr (`data-checked`, `data-selected`, `data-on`) for the same
  concept** — even when the underlying element is a checkbox-like control, the wrapper exposes
  `data-active` so callers and tests see one shape across the kit. A deeper input element can still
  carry its own native `:checked` attr; the wrapper still surfaces `data-active` on the root.
