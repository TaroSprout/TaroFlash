<script setup lang="ts">
import AppLauncher from '@/components/taro-phone/app-launcher.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useMatchMedia } from '@/composables/ui/media-query'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const is_mobile = useMatchMedia('coarse')
</script>

<template>
  <div
    data-testid="phone"
    class="absolute pointer-coarse:border-t pointer-coarse:border-l pointer-coarse:border-brown-100 dark:pointer-coarse:border-grey-900 top-7 right-0 pointer-events-auto pointer-coarse:w-66 w-60 aspect-120/179 bg-brown-300 dark:bg-grey-800 shadow-sm rounded-21 pointer-fine:rounded-16 group/phone z-10"
  >
    <ui-button
      class="absolute! top-2 right-2 pointer-fine:top-0 pointer-fine:left-0 shadow-xs pointer-fine:opacity-0 pointer-fine:group-hover/phone:opacity-100 opacity-100 transition-opacity duration-75 z-10"
      icon-left="close"
      icon-only
      data-theme="brown-100"
      :size="is_mobile ? 'lg' : 'base'"
      @press="emit('close')"
    />

    <app-launcher />
  </div>
</template>
