<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { useMobileDock } from './use-mobile-dock'

const { el, fills } = useMobileDock()

const bar = useTemplateRef<HTMLElement>('bar')

onMounted(() => (el.value = bar.value))
</script>

<template>
  <teleport to="[mobile-dock-container]">
    <footer
      v-show="fills > 0"
      ref="bar"
      data-testid="mobile-dock-host"
      class="fixed bottom-0 left-0 right-0 z-30 rounded-t-6 bg-brown-300 p-5 pb-2 transform-[translateZ(0)] dark:bg-stone-900 sm:bottom-3 sm:left-auto sm:right-3 sm:w-96 sm:rounded-6 sm:pb-5 xl:hidden"
    >
      <div
        mobile-dock-content
        data-testid="mobile-dock-host__content"
        class="relative w-full"
      ></div>
    </footer>
  </teleport>
</template>
