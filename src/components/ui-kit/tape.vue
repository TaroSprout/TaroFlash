<script setup lang="ts">
defineProps<{
  label?: string
}>()
</script>

<template>
  <div
    data-testid="ui-kit-tape"
    class="inline-flex items-center justify-center whitespace-nowrap px-8 py-2 bg-(--theme-primary)/70 tape-edges"
  >
    <span v-if="label" data-testid="ui-kit-tape__label" class="text-brown-100 text-xl">
      {{ label }}
    </span>
  </div>
</template>
