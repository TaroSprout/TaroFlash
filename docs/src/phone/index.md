---
lastUpdated: 2026-07-10T17:37:36Z
---

# TaroPhone

TaroPhone is a virtual phone UI embedded in the application that gives users access to settings, tools, and system controls without leaving their current view. Visually it lives as a small phone icon in the corner of the page; tapping it opens a phone shell containing a grid of apps.

From a developer's perspective, TaroPhone is a small collection of plain Vue components plus one Pinia store. There is no runtime, no manifest system, and no dynamic app registry — an "app" is just a `.vue` file that renders the shared `<app-shell>` and is listed directly in the launcher template.

## Architecture

```
┌─────────────────────────────────┐
│           index.vue             │  ← Positions the phone, drives open/close
│                                  │    transitions, closes on outside click
└──────────────┬──────────────────┘
               │ v-if toggles between:
┌──────────────▼──────────────────┐  ┌──────────────────────────┐
│       taro-phone-sm.vue         │  │    taro-phone-base.vue   │
│  (closed phone icon + badge)    │  │  (open phone frame)      │
└──────────────────────────────────┘  └──────────────┬────────────┘
                                                       │ renders
                                       ┌───────────────▼────────────┐
                                       │      app-launcher.vue      │  ← Lists app
                                       │                            │    components
                                       └───────────────┬────────────┘
                                                        │ renders each
                                       ┌───────────────▼────────────┐
                                       │   apps/*.vue (settings,    │  ← Self-contained;
                                       │   darkmode, feedback,      │    each wraps
                                       │   logout, ...)             │    <app-shell>
                                       └────────────────────────────┘
```

Shared state — whether the phone is open, and per-app notification counts — lives in `useTaroPhoneStore()` (`src/stores/taro-phone.ts`), not in props or provide/inject.

## File Structure

```
src/components/taro-phone/
  index.vue           ← Top-level shell: positions phone, handles open/close + outside-click
  app-shell.vue        ← Shared launcher-tile primitive (icon, title, tap animation)
  app-launcher.vue     ← Renders the grid of installed apps
  taro-phone-base.vue  ← The open phone frame (close button + app-launcher)
  taro-phone-sm.vue    ← The closed phone icon + notification badge
  apps/
    settings-app.vue   ← Opens the settings modal via useSettingsModal()
    darkmode-app.vue   ← Cycles theme mode directly via useThemeStore()
    logout-app.vue     ← Confirms + logs out via useAlert() + useSessionStore()
    feedback-app.vue   ← Launcher tile (not yet wired to an action)
```

## Key Concepts

- **[App Structure](./app-types)** — Every app is a plain component that wraps `<app-shell>`; there's no type/manifest discriminator anymore.
- **[App Logic](./controllers)** — Logic lives inline in the app component, calling composables and stores directly — no factory/controller layer.
- **[Notifications](./notifications)** — Any code with access to `useTaroPhoneStore()` can push a count badge to the phone icon.
- **[Shared State & Store Access](./context)** — Apps reach shared phone state via `useTaroPhoneStore()` directly; there's no injection key.

## Quickstart

Here's how to add a new app today.

**1. Create the component**

```vue
<!-- src/components/taro-phone/apps/my-app.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/taro-phone/app-shell.vue'
import { useToast } from '@/composables/toast'

const { t } = useI18n()
const toast = useToast()

function onPress() {
  toast.success(t('phone.apps.my-app.hello'))
}
</script>

<template>
  <app-shell
    :title="t('phone.apps.my-app.title')"
    data-theme="green-400"
    icon-src="my-app-icon"
    hover-icon-src="my-app-icon-hover"
    @press="onPress"
  />
</template>
```

**2. Add it to the launcher**

```vue
<!-- src/components/taro-phone/app-launcher.vue -->
<script setup lang="ts">
import MyApp from '@/components/taro-phone/apps/my-app.vue'
</script>

<template>
  ...
  <my-app />
</template>
```

That's it — no manifest, no registration step, no runtime IDs.

## What's in This Guide

| Page                             | What it covers                                                     |
| -------------------------------- | ------------------------------------------------------------------ |
| [App Structure](./app-types)     | How an app component is put together, and `app-shell`'s contract   |
| [App Logic](./controllers)       | Where logic lives, and how apps reach composables/stores           |
| [Notifications](./notifications) | Pushing and clearing badge notifications                           |
| [Shared State](./context)        | Accessing phone state from any app component                       |
| [API Reference](./reference)     | `app-shell` props/slots/emits, the `taro-phone` store, modal hooks |
