<script lang="ts" setup>
defineProps<{
  dashed?: boolean
  label?: string
}>()

defineSlots<{
  start(): any
  end(): any
}>()
</script>

<template>
  <div data-testid="ui-kit-divider" class="w-full flex items-center gap-2.5">
    <slot name="start"></slot>

    <hr class="w-full border-t border-t-ink-muted" :class="{ 'border-dashed ': dashed }" />

    <span v-if="label" class="text-ink-muted">{{ label }}</span>

    <hr
      v-if="label"
      class="w-full border-t border-t-ink-muted"
      :class="{ 'border-dashed ': dashed }"
    />

    <slot name="end"></slot>
  </div>
</template>
