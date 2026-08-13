---
lastUpdated: 2026-08-13T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Provide/inject editor-shaped composables across deep modal trees

When a composable owns a session of reactive state (e.g. `useDeckEditor`) and several nested children all need to read and write the same fields, the modal root should call the composable once and `provide()` the result. Children `inject()` and read/write directly, no prop drilling, no `field()` factory wrapping each key in a writable computed.

Passing a reactive object as a prop and letting the child mutate `props.config[key] = v` works because of shared references, but it bypasses Vue's emit/v-model contract: DevTools loses traceability, mutations can come from anywhere, and the prop's type signals "read-only" while the implementation says otherwise. Use provide/inject so the editor-shaped composable stays the single, obvious source of truth.

```ts
// composables/deck-editor.ts
export const deckEditorKey = Symbol('deckEditor') as InjectionKey<DeckEditor>

// modals/deck-settings/index.vue
const editor = useDeckEditor(deck)
provide(deckEditorKey, editor)

// modals/deck-settings/tab-study/index.vue
const { config } = inject(deckEditorKey)!
```

Reserve plain prop drilling for leaf components that take a derived slice (e.g. a single side's `CardAttributes`) and don't need the rest of the editor.

## Child→parent: expose, don't re-derive

When a child already owns a derived reactive value the parent also needs, the **child is the single source** and the parent consumes it. Two independent computations of "the same" condition drift — a sidebar visible while the main column fell back to its mobile layout on wide-but-short viewports.

provide/inject can't carry this direction (and inside slot content, the injecting parent is the slot _definer_, not the wrapper). Use `defineExpose` + a template ref:

- child takes a configurable default-query prop so callers can override the condition
- child resolves it once and surfaces it: `defineExpose({ has_sidebar })`
- parent reads via `useTemplateRef('tab_sheet')` + `computed(() => tab_sheet.value?.has_sidebar ?? false)`

A template-ref read of an exposed value is **one render late** — guard with a fallback, and `await nextTick()` before asserting on it in tests.
