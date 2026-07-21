<script setup lang="ts">
import type { OverlayEntry } from '@/stores/overlay-stack'
import { useOverlayStore } from '@/stores/overlay-stack'

type OverlayBackdropProps = {
  requestClose: (entry: OverlayEntry) => void
}

const { requestClose } = defineProps<OverlayBackdropProps>()

const store = useOverlayStore()

function onClick() {
  const top = store.entries.at(-1)
  if (top) requestClose(top)
}
</script>

<template>
  <transition
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    enter-active-class="transition-[opacity] ease-in-out duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
    leave-active-class="transition-[opacity] ease-in-out duration-100"
  >
    <div
      v-if="store.entries.length > 0"
      data-testid="overlay-backdrop"
      class="pointer-events-auto fixed inset-0 bg-black/10 backdrop-blur-4"
      @click="onClick"
    ></div>
  </transition>
</template>
