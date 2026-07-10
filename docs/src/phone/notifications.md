---
lastUpdated: 2026-07-10T17:37:36Z
---

# Notifications

TaroPhone has a lightweight badge notification system. Any code with access to `useTaroPhoneStore()` can push a count to the phone icon — the small red dot visible when the phone is closed.

## How It Works

```
Code calls phone.notify(app_id, count)
        │
        ▼
Store updates notifications: Record<string, number>
        │
        ▼
taro-phone-sm.vue reads notification_count → shows badge
```

Notifications are **per-app** and **upserted** — calling `notify()` a second time for the same `app_id` replaces the previous entry rather than stacking. Each app has at most one notification in the store at a time.

---

## Pushing a Notification

Call `useTaroPhoneStore().notify(app_id, count)`:

```ts
const phone = useTaroPhoneStore()

phone.notify('due-cards', 5) // badge shows "5"
phone.notify('due-cards', 10) // badge updates to "10" (upsert)
```

Unlike the old API, `count` is required — there's no "omit for 1" shorthand. Pass the actual count you want reflected in the badge total.

---

## Clearing a Notification

Call `clearNotification(app_id)` when the underlying data no longer warrants an alert:

```ts
phone.clearNotification('due-cards')
```

---

## Auto-Clear on Open

There's no `clear_notifications_on_open` flag anymore — since apps are plain components with no manifest, clearing on open is just something the app's own `onPress` handler (or a watcher on the relevant store) does explicitly:

```ts
function onPress() {
  phone.clearNotification('due-cards')
  // ... open the app's modal/view
}
```

---

## Worked Example

A notification source that watches a Pinia store and keeps the badge count in sync, set up directly in an app component's `<script setup>`:

```vue
<!-- src/components/taro-phone/apps/due-cards-app.vue -->
<script setup lang="ts">
import { useTaroPhoneStore } from '@/stores/taro-phone'
import { useDeckStore } from '@/stores/deck'

const phone = useTaroPhoneStore()
const deckStore = useDeckStore()

syncBadge()
deckStore.$subscribe(() => syncBadge())

function syncBadge() {
  const due = deckStore.decks.reduce((sum, d) => sum + d.due_count, 0)

  if (due > 0) {
    phone.notify('due-cards', due)
  } else {
    phone.clearNotification('due-cards')
  }
}
</script>
```

Because `app-launcher.vue` renders every app component unconditionally, this subscription is set up as soon as the launcher mounts — there's no separate "immediate mount" concept to opt into.

---

## Badge Display

The badge renders on `taro-phone-sm.vue` (the closed phone icon) as a small red dot when `store.notification_count > 0`:

```
notification_count = sum of all values in notifications
```

The current implementation shows a plain dot (no numeric count or `9+` overflow rendering) — see `taro-phone-sm.vue`'s `data-testid="notification-badge"` element.

---

## Notification Lifetime

Notifications are **ephemeral** — they live only in the Pinia store's reactive memory and do not persist across page refreshes. Apps that set up a store subscription re-run that subscription on every app mount, which re-evaluates current state and re-pushes any badges that are still relevant.
