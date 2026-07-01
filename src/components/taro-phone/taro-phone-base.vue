<script setup lang="ts">
import AppLauncher from '@/components/taro-phone/app-launcher.vue'
import UiButton from '@/components/ui-kit/button.vue'

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div
    data-testid="phone"
    class="absolute border-t border-l border-brown-100 dark:border-grey-900 top-7 right-0 pointer-events-auto w-60 aspect-120/179 bg-brown-300 dark:bg-grey-800 shadow-sm rounded-16 group/phone z-10"
  >
    <ui-button
      data-theme="brown-100"
      data-theme-dark="stone-700"
      class="absolute! top-0 right-0 shadow-xs z-10"
      icon-left="close"
      icon-only
      size="lg"
      @press="emit('close')"
    />

    <app-launcher />
  </div>
</template>
