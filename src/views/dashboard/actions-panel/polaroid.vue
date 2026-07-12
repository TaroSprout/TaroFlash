<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
</script>

<template>
  <div
    data-testid="dashboard-actions-panel__polaroid"
    class="absolute top-1 -left-1 z-10 -rotate-12 select-none"
  >
    <ui-icon
      src="paperclip"
      class="absolute -top-3 left-12 z-10 size-10 rotate-200 text-grey-400"
    />

    <div class="bg-brown-50 dark:bg-stone-800 rounded-2 shadow-xs w-30 p-2 pb-6">
      <div
        data-testid="dashboard-actions-panel__polaroid-photo"
        class="bg-brown-200 dark:bg-stone-900 rounded-1 aspect-square"
      />
    </div>
  </div>
</template>
