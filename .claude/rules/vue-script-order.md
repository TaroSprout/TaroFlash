---
lastUpdated: 2026-08-08T00:00:00Z
paths:
  - 'src/**/*.vue'
---

# Vue `<script setup>` ordering

**Owns the top-to-bottom order of `<script setup>` declarations.** Reaches you editing any `.vue`
file's script block.

Declarations live in fixed top-to-bottom order. No mid-file `ref` / `computed` / `function` definitions sprinkled near their first use.

```
1. imports
2. types          — type aliases / interfaces (always at top)
3. defines        — defineProps / defineEmits / defineSlots / defineExpose / defineOptions
4. composables    — useI18n(), useStore(), useFoo(), inject(), provide()
                    + local state refs (ref(), reactive(), shallowRef())
5. computed       — every computed() / writable computed
6. lifecycle      — onMounted / onBeforeUnmount / etc.
7. functions      — handlers, helpers, async actions
8. watchers       — watch() / watchEffect() at the very bottom
```

## Rules

- Group each bucket together. Don't interleave (e.g. don't put a `function` between two `computed`s).
- All `type` / `interface` declarations sit at the top, above defines — even when only used by one bucket.
- State refs (`ref`, `reactive`) belong with composables — they're the file's "setup" surface.
- `provide()` calls go right after the composable that produced the value.
- Lifecycle goes after computed because hooks usually orchestrate state declared above and don't depend on local functions.
- Watchers go last — they react to everything else and frequently call the functions declared above them.

## Good

```ts
// imports
import { computed, onMounted, provide, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

// types
type ActiveTab = 'general' | 'design' | 'study'
export type DeckSettingsResponse = boolean

// defines
const { deck, close } = defineProps<{ ... }>()

// composables + state
const { t } = useI18n()
const editor = useDeckEditor(deck)
provide(deckEditorKey, editor)

const active_tab = ref<ActiveTab | null>(null)
const preview_mounted = ref(false)

// computed
const displayed_tab = computed(() => active_tab.value ?? 'general')
const tab_component = computed(() => TAB_COMPONENTS[displayed_tab.value])

// lifecycle
onMounted(() => {
  requestAnimationFrame(() => (preview_mounted.value = true))
})

// functions
function onSave() { ... }
function onTabEnter(...) { ... }

// watchers
watch(is_tablet, (below) => {
  if (below && active_tab.value === 'danger-zone') active_tab.value = null
})
```
