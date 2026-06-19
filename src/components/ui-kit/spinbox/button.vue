<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import { useStagedTap } from '@/composables/ui/staged-tap'
import { TYPE_SFX } from '@/sfx/config'

type SpinboxButtonProps = {
  icon: string
  disabled?: boolean
}

const { icon, disabled = false } = defineProps<SpinboxButtonProps>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const { playing, tap } = useStagedTap({ triggerAt: 'press' })

function onCaptureClick(e: MouseEvent) {
  tap(() => emit('click'), { audio: 'ui.select', captureMode: true })(e)
}
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    class="inline-flex items-center justify-center aspect-square h-8 rounded-3 text-brown-700 dark:text-brown-100 cursor-pointer transition-[background-color,color,transform] duration-100 hover:bg-(--theme-primary) hover:text-(--theme-on-primary) active:scale-95 disabled:opacity-[0.35] disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-brown-700 dark:disabled:hover:text-brown-100"
    :data-playing="playing || null"
    v-sfx="{ hover: TYPE_SFX }"
    @click.capture="onCaptureClick"
  >
    <ui-icon :src="icon" class="size-5" />
  </button>
</template>
