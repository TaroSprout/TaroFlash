# Watchers are a last resort

`watch` / `watchEffect` is not a default. Before adding one, ask whether the same thing can be expressed declaratively — a `computed`, conditional rendering, an event handler, or a one-time `onMounted` seed.

Watchers hide control flow as a side-effect reacting to state: harder to follow, easy to fire spuriously. A declarative form makes the dependency explicit and is usually self-correcting.

They aren't banned — imperatively syncing into an uncontrolled DOM node is legitimate. The point is that they're reached for far too readily. When one is genuinely right, keep it minimal and say why inline.

```ts
// Bad — a prop→DOM sync watcher fighting an uncontrolled editor, corrupting the caret
watch(() => props.content, (v) => { el.value.innerText = v })

// Good — render read-only mode declaratively; seed the editable surface once, never re-sync
<div v-if="!editing">{{ content }}</div>
```
