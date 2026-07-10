---
lastUpdated: 2026-07-10T17:37:36Z
---

# Context Injection

Pass arbitrary data into a modal's Vue subtree using the `context` option. Any component rendered inside the modal — at any depth — can inject it.

## Basic Usage

```ts
const MY_KEY = 'my-context'

modal.open(MyModal, {
  context: {
    key: MY_KEY,
    value: { user, settings }
  }
})
```

Inside `MyModal` or any of its descendants:

```ts
import { inject } from 'vue'

const ctx = inject<{ user: User; settings: Settings }>('my-context')!
```

---

## Typed Keys

Use a Vue `InjectionKey` instead of a plain string to get TypeScript inference on `inject()` automatically:

```ts
import type { InjectionKey } from 'vue'

type MyContext = { user: User; settings: Settings }
const MY_KEY: InjectionKey<MyContext> = Symbol('my-context')

modal.open(MyModal, {
  context: { key: MY_KEY, value: { user, settings } }
})
```

```ts
// Inside the modal — type is inferred, no generic needed
const ctx = inject(MY_KEY)!
// ctx: MyContext
```

---

## How It Works

`modal.vue` renders each stack entry inside a `<modal-slot>` wrapper. `modal-slot.vue` calls `provide(context.key, context.value)` before rendering the component, so `inject()` resolves from anywhere inside the modal subtree.

::: tip
`context.value` is wrapped in `markRaw` internally before being stored, so objects you pass are never made reactive — mutating them won't trigger Vue reactivity in the modal subtree. Pass already-reactive refs/reactive objects inside `value` if a descendant needs to react to changes.
:::
