<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import { emitSfx } from '@/sfx/bus'
import { TYPE_SFX } from '@/sfx/config'

type SpinboxButtonProps = {
  icon: string
  disabled?: boolean
}

const { icon, disabled = false } = defineProps<SpinboxButtonProps>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

function onClick() {
  emitSfx('select')
  emit('click')
}
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    class="inline-flex items-center justify-center aspect-square h-8 rounded-3 text-ink cursor-pointer transition-[background-color,color,transform] duration-100 hover:bg-accent hover:text-on-accent active:scale-95 disabled:opacity-[0.35] disabled:hover:bg-transparent disabled:hover:text-ink"
    v-sfx="{ hover: TYPE_SFX }"
    @click="onClick"
  >
    <ui-icon :src="icon" class="size-4" />
  </button>
</template>
