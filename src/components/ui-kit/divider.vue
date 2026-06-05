<script lang="ts" setup>
defineProps<{
  dashed?: boolean
  label?: string
}>()
</script>

<template>
  <div data-testid="ui-kit-divider" class="w-full flex items-center gap-2.5">
    <hr class="w-full border-t border-t-brown-500" :class="{ 'border-dashed ': dashed }" />

    <span v-if="label" class="text-brown-500">{{ label }}</span>

    <hr
      v-if="label"
      class="w-full border-t border-t-brown-500"
      :class="{ 'border-dashed ': dashed }"
    />
  </div>
</template>
