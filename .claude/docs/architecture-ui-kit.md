# ui-kit & layout-kit conventions

## ui-kit primitives that span multiple files live in a directory

A ui-kit component that needs more than one file (private subcomponents, a colocated composable, a sizes/config table) lives in `src/components/ui-kit/<name>/` with `index.vue` as the public entry. Sibling files use kebab-case (`button.vue`, `use-numeric-input.ts`) and are imported relatively from `index.vue`. Callers import the directory: `import UiSpinbox from '@/components/ui-kit/spinbox/index.vue'`.

```
src/components/ui-kit/spinbox/
├── index.vue            # public component (imports siblings relatively)
├── button.vue           # private subcomponent
└── use-numeric-input.ts # colocated composable used only by this primitive
```

Single-file primitives stay flat (`src/components/ui-kit/icon.vue`).

## ui-kit primitives stay domain-neutral

Prop names, slot names, and emit names on `src/components/ui-kit/*` primitives describe shape, not consumer semantics. A spinbox's secondary toggle is `pill_label` / `pill_active`, not `all_label` / `all_active`. A toggle's selected state is `data-active`, not `data-published`. Domain meaning ("all means unbounded for daily limits", "published means visible to other members") lives at the call site that wires the primitive into a feature.

```ts
// Bad — primitive bakes the daily-limit domain into its prop names
type SpinboxProps = { all_label?: string; all_active?: boolean }

// Good — primitive describes the shape (a trailing pill); caller maps domain meaning
type SpinboxProps = { pill_label?: string; pill_active?: boolean }
```

When you catch a domain-y name slipping into a ui-kit prop, rename before more callers depend on it. The primitive exists to be reused across features that don't share vocabulary.

## Layout-only primitives live in `layout-kit/`, not `ui-kit/`

`src/components/layout-kit/` is for components that arrange other content without injecting visual identity — `section-list.vue`, `labeled-section.vue`, `mobile-sheet.vue`, `tab-sheet.vue`. Anything with its own visual treatment (button, spinbox, toggle, icon) belongs in `ui-kit/`. The split keeps layout primitives composable across surfaces without dragging styling assumptions with them.
