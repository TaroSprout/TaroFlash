<script setup lang="ts">
import { provide } from 'vue'
import { MODAL_ID_KEY, type ModalContext } from '@/composables/modal'

type ModalSlotProps = {
  id: string
  context?: ModalContext
}

const { id, context } = defineProps<ModalSlotProps>()

provide(MODAL_ID_KEY, id)

if (context !== undefined) {
  provide(context.key, context.value)
}
</script>

<template>
  <slot></slot>
</template>
