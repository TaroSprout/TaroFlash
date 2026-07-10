---
lastUpdated: 2026-07-10T17:37:36Z
---

# API Reference

## `app-shell.vue`

`src/components/taro-phone/app-shell.vue` — the shared launcher-tile primitive every app renders.

### Props (`AppShellProps`)

```ts
type AppShellProps = {
  title: string
  iconSrc?: string
  hoverIconSrc?: string
  tapHold?: number // default: 0.1
  tapDuration?: number // default: 0.1
  instantAction?: boolean // default: false
}
```

| Prop            | Description                                                                              |
| --------------- | ---------------------------------------------------------------------------------------- |
| `title`         | Label rendered under the tile.                                                           |
| `iconSrc`       | Default icon name, resolved via `ui-image`.                                              |
| `hoverIconSrc`  | Icon shown on hover/focus/active in place of `iconSrc`.                                  |
| `tapHold`       | Seconds the tap animation holds at peak before `press` fires (when not `instantAction`). |
| `tapDuration`   | Duration of the pop tap animation.                                                       |
| `instantAction` | Fires `press` on pointerdown instead of waiting for the tap animation's peak.            |

`data-theme` / `data-theme-dark` and other attrs are forwarded to the root `<button>` via `$attrs` (`inheritAttrs: false`) — set them directly on the `<app-shell>` tag.

### Slots

| Slot    | Description                                                                                  |
| ------- | -------------------------------------------------------------------------------------------- |
| default | Replaces the icon rendering; falls back to `iconSrc`/`hoverIconSrc` `ui-image`s when unused. |

### Emits

```ts
{ press: [e: MouseEvent] }
```

Fired once per tap, after the tap animation resolves (or immediately if `instantAction` is set).

---

## The `taro-phone` Store

`src/stores/taro-phone.ts` — a plain Pinia setup store. This is the only shared state layer for the phone; there is no separate context/injection object.

### State

| Field                      | Type                          | Description                                                              |
| -------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `is_open`                  | `Ref<boolean>`                | Whether the phone frame (`taro-phone-base.vue`) is currently shown.      |
| `notifications`            | `Ref<Record<string, number>>` | Per-app notification counts, keyed by an arbitrary app id string.        |
| `was_hidden_for_app_modal` | `Ref<boolean>`                | Internal flag tracking whether the phone was auto-hidden by `openApp()`. |

### Computed

| Field                | Type                  | Description                                             |
| -------------------- | --------------------- | ------------------------------------------------------- |
| `notification_count` | `ComputedRef<number>` | Sum of all values in `notifications` — the badge total. |

### Actions

| Action                                      | Description                                                                                                                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open()`                                    | Sets `is_open` to `true`.                                                                                                                                                        |
| `close()`                                   | Sets `is_open` to `false`.                                                                                                                                                       |
| `openApp(result: OpenModalResult<unknown>)` | Hides the phone (`is_open = false`) while an app-launched modal is open, and reopens it once `result.response` settles — unless the phone was explicitly closed in the meantime. |
| `notify(app_id: string, count: number)`     | Upserts the notification count for `app_id`.                                                                                                                                     |
| `clearNotification(app_id: string)`         | Removes the notification entry for `app_id`.                                                                                                                                     |

### Example

```ts
import { useTaroPhoneStore } from '@/stores/taro-phone'

const phone = useTaroPhoneStore()

phone.notify('due-cards', 5) // badge shows 5
phone.clearNotification('due-cards') // badge entry removed

phone.openApp(settingsModal.open()) // hides phone, reopens when modal closes
```

---

## Modal Hooks (the `useXModal()` Pattern)

Apps that open a shared modal (rather than acting immediately) wrap `useModal()` in a small dedicated composable instead of calling `useModal().open()` directly from the app component. This keeps the modal's config (backdrop, sheet breakpoints, component) in one place shared by every entry point.

```ts
// src/composables/settings/use-settings-modal.ts
import { useModal } from '@/composables/modal'
import { SETTINGS_SHEET_BREAKPOINTS } from '@/views/settings/layout'
import SettingsComponent from '@/views/settings/index.vue'

/** Opens the settings modal. Shared by the phone launcher and any other settings entry point. */
export function useSettingsModal() {
  const modal = useModal()

  function open() {
    return modal.open(SettingsComponent, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: SETTINGS_SHEET_BREAKPOINTS.width,
      mobile_below_height: SETTINGS_SHEET_BREAKPOINTS.height
    })
  }

  return { open }
}
```

The app component calls it and hands the result straight to `phone.openApp()`:

```ts
const phone = useTaroPhoneStore()
const settingsModal = useSettingsModal()

function onPress() {
  phone.openApp(settingsModal.open())
}
```

See `src/composables/modal/` for `useModal()` and `OpenModalResult` themselves — those aren't phone-specific.

---

## Component Tree

| Component             | Path                                            | Responsibility                                                                                 |
| --------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `index.vue`           | `src/components/taro-phone/index.vue`           | Positions the phone, drives open/close transitions, outside-click close.                       |
| `taro-phone-sm.vue`   | `src/components/taro-phone/taro-phone-sm.vue`   | Closed phone icon; renders the notification badge from `notification_count`.                   |
| `taro-phone-base.vue` | `src/components/taro-phone/taro-phone-base.vue` | Open phone frame; close button + `app-launcher`.                                               |
| `app-launcher.vue`    | `src/components/taro-phone/app-launcher.vue`    | Renders the grid of app components; keyboard nav between tiles.                                |
| `app-shell.vue`       | `src/components/taro-phone/app-shell.vue`       | Shared launcher-tile primitive (see above).                                                    |
| `apps/*.vue`          | `src/components/taro-phone/apps/`               | Individual apps: `settings-app.vue`, `darkmode-app.vue`, `logout-app.vue`, `feedback-app.vue`. |
