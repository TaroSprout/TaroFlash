---
lastUpdated: 2026-08-13T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Watchers are a last resort

**Owns when a `watch`/`watchEffect` is warranted vs. a declarative alternative.**

- **Before adding a `watch`/`watchEffect`, check whether the same thing can be expressed
  declaratively** — a `computed`, conditional rendering, an event handler, or a one-time `onMounted`
  seed. A watcher hides control flow as a side-effect reacting to state: harder to follow, easy to
  fire spuriously.
- **A watcher is legitimate for imperatively syncing into an uncontrolled DOM node.** Keep it minimal
  and say why inline.

```ts
// Bad — a prop→DOM sync watcher fighting an uncontrolled editor, corrupting the caret
watch(() => props.content, (v) => { el.value.innerText = v })

// Good — render read-only mode declaratively; seed the editable surface once, never re-sync
<div v-if="!editing">{{ content }}</div>
```
