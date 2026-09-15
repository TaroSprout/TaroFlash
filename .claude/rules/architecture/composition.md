---
lastUpdated: 2026-08-13T00:00:00Z
paths:
  - 'src/**/*.{ts,vue}'
---

# Component composition over code merging

**Owns composing components vs. inlining another component's code.**

- Import and use the child component rather than inlining its template or script code when
  consolidating or moving functionality between components.

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

- Adjust props/emits to wire components together.

## Slot content gets its own component

- When a parent fills a child's named slot (`#header-start`, `#header-end`) with more than a
  trivial one-liner — a button, a menu, a local computed — extract that content into its own
  component and drop a single tag into the slot.
- Applies whenever the slotted UI has its own props, emits, or local state.
