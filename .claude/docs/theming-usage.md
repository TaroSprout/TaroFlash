# Applying theme tokens

## At a call site

Pass `data-theme` (and `data-theme-dark` if needed) directly on the child element or component:

```vue
<template>
  <ui-button data-theme="blue-500" data-theme-dark="blue-300">Save</ui-button>

  <div data-theme="green-400">
    <div class="bg-(--theme-primary) text-(--theme-on-primary)">...</div>
  </div>
</template>
```

If `data-theme-dark` is omitted, the same `data-theme` value applies in dark mode.

## Inside a themed component

Don't declare `theme` / `themeDark` props. With default `inheritAttrs`, `data-theme` and `data-theme-dark` from the call site flow onto the component's root automatically. Consume the scoped tokens anywhere inside:

```vue
<template>
  <div class="bg-(--theme-primary) text-(--theme-on-primary)">...</div>
</template>
```

If the component uses `defineOptions({ inheritAttrs: false })`, forward the attrs explicitly onto the root that should carry the theme.

## In CSS / `<style>`

```css
.my-component {
  background-color: var(--theme-primary);
  color: var(--theme-on-primary);
}
```
