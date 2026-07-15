<script setup lang="ts">
defineSlots<{
  hero(): unknown
  main(): unknown
}>()
</script>

<template>
  <div
    data-testid="deck-shell"
    class="flex flex-col xl:flex-row items-center xl:items-start gap-6 md:gap-15"
  >
    <slot name="hero" />
    <slot name="main" />
  </div>
</template>
