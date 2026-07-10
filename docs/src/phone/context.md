---
lastUpdated: 2026-07-10T17:37:36Z
---

# Shared State & Store Access

There is no injection-based `AppContext` anymore. Apps that need phone-level state — whether the phone is open, notification counts, hiding the phone for a modal — call `useTaroPhoneStore()` directly, the same way any component reaches a Pinia store.

## `useTaroPhoneStore()`

```ts
import { useTaroPhoneStore } from '@/stores/taro-phone'

const phone = useTaroPhoneStore()
```

Available anywhere — inside an app component, inside `index.vue`, inside `taro-phone-sm.vue` — with no provide/inject step and no wrapper component required. See [API Reference](./reference#the-taro-phone-store) for the full state/action shape.

### Example: an app hiding the phone for a modal

```vue
<script setup lang="ts">
import { useTaroPhoneStore } from '@/stores/taro-phone'
import { useSettingsModal } from '@/composables/settings/use-settings-modal'

const phone = useTaroPhoneStore()
const settingsModal = useSettingsModal()

function onPress() {
  phone.openApp(settingsModal.open())
}
</script>
```

### Example: pushing a notification

```ts
const phone = useTaroPhoneStore()
phone.notify('due-cards', 5)
// ...later
phone.clearNotification('due-cards')
```

## Other Shared State

Anything that isn't phone-specific — theme, session, i18n — is reached the normal way, with the composable/store for that domain:

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/stores/theme'
import { useSessionStore } from '@/stores/session'

const { t } = useI18n()
const theme_store = useThemeStore()
const session = useSessionStore()
</script>
```

There's no phone-scoped `t()` or navigation helper distinct from the app's own composables — apps use `useI18n()` directly, same as any other component in the codebase.

## No Deep-Tree Injection

Because apps are flat, self-contained components (not nested view/controller trees), there's no need for an injection key to avoid prop drilling — each app component calls the stores/composables it needs at its own top level. If an app's markup grows deep child components that also need phone state, those children call `useTaroPhoneStore()` themselves; Pinia stores are globally accessible, so this works at any depth without extra plumbing.
