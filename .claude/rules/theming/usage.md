---
lastUpdated: 2026-08-15T00:00:00Z
paths:
  - 'src/**/*.{vue,css}'
---

# Applying a role

**Owns the call-site and in-component syntax for setting a switch and consuming a role.**

## At a call site

Set the switch as a plain attribute on the element that should carry it — a palette name (`blue`,
`green`, `pink`) or one of its meaning aliases (`brand`, `info`, `danger`, `error`, `success`,
`warning`):

```vue
<template>
  <ui-button data-palette="danger">Delete</ui-button>

  <div data-palette="green">
    <span class="bg-(--color-accent) text-(--color-on-accent)">…</span>
  </div>
</template>
```

- **Prefer the meaning over the colour** where one exists — `data-palette="danger"` survives a
  repoint in the registry; `data-palette="red"` freezes today's answer.
- **Bind `undefined`, never `''`, to switch a palette off.** The neutral branch keys off the
  attribute being absent, and an empty string still matches `[data-palette]`.

## Inside a component

- **Don't declare a `palette` / `station` prop to re-emit as an attribute.** With default
  `inheritAttrs`, a caller's `data-palette` lands on the component root on its own; a prop only earns
  its place when the component picks the value itself (`:data-palette="error ? 'danger' : undefined"`).
- **Drive the neutral/accent split off the attribute's presence, not a boolean prop** — one selector
  covers both states and can't disagree with the attribute:

```css
.ui-kit-tag {
  --tag-bg: var(--color-raised);
}
.ui-kit-tag[data-palette] {
  --tag-bg: var(--color-accent);
}
```

## Teleported content

**Teleporting to `<body>` severs the attribute chain — restate the switch on the teleported node.**
Read the trigger's resolved palette (`trigger.closest('[data-palette]')`) and bind it onto the
floating element; floating chrome also declares its own `data-station="float"`, since the station it
was mounted under no longer reaches it.

## In CSS

```css
.my-component {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}
```
