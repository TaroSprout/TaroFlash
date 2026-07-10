---
lastUpdated: 2026-07-10T17:37:36Z
---

# App Logic

There is no separate controller/factory layer. Each app's logic — state, composables, store access, side effects — lives directly in its own `.vue` file, right alongside the markup that renders it.

## Where Logic Lives

An app component is both the model and the view: it calls whatever composables and stores it needs in `<script setup>`, and wires the result to `<app-shell>`'s `@press` emit.

```vue
<!-- src/components/taro-phone/apps/logout-app.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/taro-phone/app-shell.vue'
import { useAlert } from '@/composables/alert'
import { useSessionStore } from '@/stores/session'

const { t } = useI18n()
const alert = useAlert()
const session = useSessionStore()

function onPress() {
  const { response } = alert.warn({
    title: t('phone.apps.logout.title'),
    message: t('phone.apps.logout.description'),
    confirmLabel: t('phone.apps.logout.confirm'),
    cancelAudio: 'digi_powerdown',
    confirmAudio: 'toggle_off'
  })

  response.then((result) => {
    if (result) session.logout()
  })
}
</script>
```

For simple apps this is the entire file — there's no separate `controller.ts`, no factory function, and nothing to register.

## Reactive State Inside an App

Apps that need to derive their own display state (icon, theme, title) just use `computed()` and `storeToRefs()` like any other component:

```vue
<!-- src/components/taro-phone/apps/darkmode-app.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore, type ThemeMode } from '@/stores/theme'

const theme_store = useThemeStore()
const { mode } = storeToRefs(theme_store)
const { cycle } = theme_store

const modes = computed<{ [key in ThemeMode]: ModeConfig }>(() => ({
  system: { labelKey: 'phone.apps.darkmode.mode-system', theme: 'purple-500' },
  light: { labelKey: 'phone.apps.darkmode.mode-light', theme: 'orange-500' },
  dark: { labelKey: 'phone.apps.darkmode.mode-dark', theme: 'blue-650' }
}))

const active_mode_config = computed(() => modes.value[mode.value])
</script>
```

## Background Work / Subscriptions

There's no `mount_policy: 'immediate'` concept and no dedicated startup hook for apps. If an app needs to run logic before the user opens it (e.g. keeping a notification badge in sync with store state), that subscription is set up wherever the app component lives in the tree — since `app-launcher.vue` renders every app unconditionally, each app component's own `<script setup>` body runs as soon as the launcher mounts, which is effectively immediate.

```vue
<script setup lang="ts">
import { useTaroPhoneStore } from '@/stores/taro-phone'
import { useDeckStore } from '@/stores/deck'

const phone = useTaroPhoneStore()
const deckStore = useDeckStore()

deckStore.$subscribe((_, state) => {
  const due = state.decks.reduce((sum, d) => sum + d.due_count, 0)
  phone.notify('due-cards', due)
})
</script>
```

## Opening Modals from an App

Apps that need a shared modal (e.g. settings) pull it in via a small `useXModal()` composable rather than owning the modal wiring themselves:

```vue
<!-- src/components/taro-phone/apps/settings-app.vue -->
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

`phone.openApp(result)` hides the phone shell while the modal is open and reopens it once the modal's `response` promise settles. See [`taro-phone` store](./reference#the-taro-phone-store) for the full method.
