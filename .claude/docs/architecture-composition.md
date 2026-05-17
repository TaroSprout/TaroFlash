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
