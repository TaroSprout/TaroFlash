---
lastUpdated: 2026-08-13T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# ui-kit & layout-kit conventions

**Owns file layout, naming, and domain-neutrality for `ui-kit`/`layout-kit` primitives.**

## ui-kit primitives that span multiple files live in a directory

- A ui-kit component needing more than one file (private subcomponents, a colocated composable, a
  sizes/config table) lives in `src/components/ui-kit/<name>/` with `index.vue` as the public entry.
- Sibling files inside that directory use kebab-case (`button.vue`, `use-numeric-input.ts`) and
  import relatively from `index.vue` — callers import the directory's `index.vue`
  (`import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'`).
- Single-file primitives stay flat (`src/components/ui-kit/icon.vue`).

```
src/components/ui-kit/spinbox/
├── index.vue            # public component (imports siblings relatively)
├── button.vue           # private subcomponent
└── use-numeric-input.ts # colocated composable used only by this primitive
```

## ui-kit primitives stay domain-neutral

- Prop names, slot names, and emit names on `src/components/ui-kit/*` primitives describe shape, not
  consumer semantics — a spinbox's secondary toggle is `pill_label` / `pill_active`, not `all_label` /
  `all_active`; a toggle's selected state is `data-active`, not `data-published`.
- Domain meaning ("all means unbounded for daily limits", "published means visible to other
  members") lives at the call site that wires the primitive into a feature, never on the primitive.
- Rename a domain-y name slipping into a ui-kit prop before more callers depend on it —
  [`code-style/signatures`](../code-style/signatures.md) states the same naming-for-role rule for a
  function parameter.

```ts
// Bad — primitive bakes the daily-limit domain into its prop names
type SpinboxProps = { all_label?: string; all_active?: boolean }

// Good — primitive describes the shape (a trailing pill); caller maps domain meaning
type SpinboxProps = { pill_label?: string; pill_active?: boolean }
```

## Layout-only primitives live in `layout-kit/`, not `ui-kit/`

- `src/components/layout-kit/` is for components that arrange other content without injecting
  visual identity (`section-list.vue`, `labeled-section.vue`, `field-row.vue`,
  `crossfade-resize.vue`); anything with its own visual treatment (button, spinbox, toggle, icon)
  belongs in `ui-kit/`.

## Naming

- ui-kit primitives import as `Ui<PascalName>` and render as `<ui-name>` — `UiButton` /
  `<ui-button>`, `UiTagButton` / `<ui-tag-button>`; the file stays kebab-case (`tag-button.vue`).

The `layout-kit` window family follows three naming constraints, worth applying to the next
primitive that needs a name:

- **`modal` is off-limits** — `dialog-card` is also a modal. Dialog vs window is the distinguishing axis: a small transient dialog against a large workflow window (`app-window`, `paged-window`).
- **No domain-forcing names** — `settings-modal` was rejected because the surface might outgrow settings.
- **No breakpoint words** — `mobile-sheet` was the original sin. Breakpoint behaviour is a _mode_ (`'phone' | 'tablet' | 'desktop'`), not an identity.

## Check the prop surface before a CSS override

- Before reaching for `rotate`/`scale`/override classes to change a primitive's visual variant, open
  the file and look for a prop that already models it — `ui-kit/tag.vue` exposes `notchSide`, so
  `class="-rotate-3"` bypasses the design system.
- Fall back to CSS only when the component genuinely doesn't model the variant.

## `icon-only` labels render as tooltips

- When an `icon-only` `UiButton` needs a label, keep `icon-only` and put the text in the default
  slot — it renders as a tooltip; don't drop `icon-only` to surface the text inline.

## Fix a stray event at its source

- When a primitive misbehaves because of a spurious upstream event, neutralise it where it
  originates rather than widening the primitive's API with a behaviour toggle
  ([`architecture/api-layer`](./api-layer.md) states the general rule) — a pointer-driven transcript
  emitting a trailing compatibility `click` that dismissed a popover was fixed with a capture-phase
  swallower scoped to the transcript, not a `dismiss_event` prop on the popover.
