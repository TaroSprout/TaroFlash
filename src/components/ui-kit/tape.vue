<script setup lang="ts">
defineSlots<{
  default?(): unknown
}>()
</script>

<template>
  <div
    data-testid="ui-kit-tape"
    class="relative inline-flex items-center justify-center whitespace-nowrap px-8 py-2 opacity-90 bg-(--theme-accent) bgx-leaf bgx-color-[var(--theme-on-accent)] bgx-opacity-15 bgx-size-20 tape-edges"
  >
    <span
      v-if="$slots.default"
      data-testid="ui-kit-tape__label"
      class="relative text-(--theme-on-accent)"
    >
      <slot></slot>
    </span>
  </div>
</template>
