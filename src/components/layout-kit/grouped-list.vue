<script setup lang="ts">
defineSlots<{
  default(): any
  /** Absolutely positioned over the list; content must opt in with pointer-events-auto. */
  overlay?(): any
}>()
</script>

<template>
  <div
    data-testid="grouped-list"
    class="relative flex flex-col rounded-4 bg-input dark:bg-stone-700 overflow-hidden"
  >
    <slot></slot>

    <div
      v-if="$slots.overlay"
      data-testid="grouped-list__overlay"
      class="absolute inset-0 pointer-events-none"
    >
      <slot name="overlay"></slot>
    </div>
  </div>
</template>
