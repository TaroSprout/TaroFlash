---
lastUpdated: 2026-08-13T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Component composition over code merging

When consolidating or moving functionality between components, import and use the child component rather than inlining its template or script code.

```vue
<!-- Bad: copying markup and logic from <rating-buttons> into parent -->

<!-- Good: import and compose -->
<script setup lang="ts">
import RatingButtons from '@/components/rating-buttons.vue'
</script>
<template>
  <rating-buttons @rate="onRate" />
</template>
```

Adjust props/emits to wire components together. Don't copy template markup or script logic across files.

## Slot content gets its own component

When a parent fills a child's named slot (`#header-start`, `#header-end`) with more than a trivial one-liner, extract that content into its own component and drop a single tag into the slot. Don't inline buttons, menus, or local computeds into the slot-filler template.

Applies whenever the slotted UI has its own props, emits, or local state.
