---
lastUpdated: 2026-07-10T17:37:36Z
---

# App Structure

There is no manifest or type system anymore — every TaroPhone app is just a `.vue` file under `src/components/taro-phone/apps/` that renders the shared `<app-shell>` component and is listed directly in `app-launcher.vue`.

## The Shape of an App

An app component is self-contained: it owns its own icon, title, theme, and press behaviour, and pulls in whatever composables/stores it needs directly. There's no external configuration object describing it.

```vue
<!-- src/components/taro-phone/apps/settings-app.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/taro-phone/app-shell.vue'
import { useTaroPhoneStore } from '@/stores/taro-phone'
import { useSettingsModal } from '@/composables/settings/use-settings-modal'

const { t } = useI18n()
const phone = useTaroPhoneStore()
const settingsModal = useSettingsModal()

function onPress() {
  phone.openApp(settingsModal.open())
}
</script>

<template>
  <app-shell
    :title="t('phone.apps.settings.title')"
    data-theme="pink-400"
    data-theme-dark="pink-600"
    icon-src="settings"
    hover-icon-src="settings-hover"
    @press="onPress"
  />
</template>
```

Every app follows the same recipe: render `<app-shell>` for the tile, theme it with `data-theme`/`data-theme-dark`, and handle the `@press` emit however that app needs to.

## `app-shell.vue`

`app-shell` (`src/components/taro-phone/app-shell.vue`) is the single primitive every app is built on. It renders the launcher tile — the tap-animated button plus its title — and lets the app fill in the icon and the tap behaviour.

### Props

| Prop            | Type       | Default | Description                                                                                   |
| --------------- | ---------- | ------- | --------------------------------------------------------------------------------------------- |
| `title`         | `string`   | —       | Label shown under the tile.                                                                   |
| `iconSrc`       | `string?`  | —       | Default icon, resolved via `ui-image`.                                                        |
| `hoverIconSrc`  | `string?`  | —       | Alternate icon shown on hover/focus/active.                                                   |
| `tapHold`       | `number?`  | `0.1`   | Seconds the tap animation holds at its peak before firing `press`.                            |
| `tapDuration`   | `number?`  | `0.1`   | Duration of the pop animation.                                                                |
| `instantAction` | `boolean?` | `false` | When `true`, `press` fires immediately on pointerdown instead of at the tap animation's peak. |

`data-theme` / `data-theme-dark` are forwarded via `$attrs` (`inheritAttrs: false`), not dedicated props — set them directly on `<app-shell>` in the app's template, per the theming convention.

### Slots

| Slot    | Description                                                                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| default | Replaces the icon markup entirely. Used by apps like `darkmode-app.vue` that swap icons based on reactive state rather than a static `iconSrc`/`hoverIconSrc` pair. |

### Emits

| Event   | Payload      | Fired                                                                  |
| ------- | ------------ | ---------------------------------------------------------------------- |
| `press` | `MouseEvent` | After the tap animation resolves (or immediately, if `instantAction`). |

### Example: custom icon via the default slot

```vue
<!-- src/components/taro-phone/apps/darkmode-app.vue -->
<app-shell
  :data-theme="theme"
  :title="title"
  :tap-hold="0"
  :tap-duration="0.2"
  instant-action
  @press="cycleMode"
>
  <ui-image v-if="mode === 'system'" src="darkmode-system" />
  <ui-image v-else-if="mode === 'light'" src="darkmode-light" />
  <ui-image v-else src="darkmode-dark" />
</app-shell>
```

## Apps That Open a Modal vs. Apps That Act Directly

Nothing in the system distinguishes these — it's just what the app component does in its `onPress` handler:

- **Opens a modal**: `settings-app.vue` calls `phone.openApp(settingsModal.open())`, which hides the phone while the modal is open and reopens it once the modal resolves. See [`taro-phone` store](./reference#the-taro-phone-store) for what `openApp()` does.
- **Acts immediately, no modal**: `darkmode-app.vue` cycles the theme directly with no navigation at all.
- **Confirms then acts**: `logout-app.vue` opens an `useAlert()` confirmation and logs out via `useSessionStore()` if confirmed.

## Adding a New App

1. Create the component under `src/components/taro-phone/apps/`, wrapping `<app-shell>`.
2. Add the required translation keys under `phone.apps.<app-name>.*` in `src/locales/en-us.json`.
3. Import the component and add it to the grid in `app-launcher.vue`.

There's no install/registration step, no runtime-assigned `id`, and no dynamic import — the component is just referenced directly like any other Vue component.
