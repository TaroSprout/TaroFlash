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
