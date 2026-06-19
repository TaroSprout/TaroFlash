<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import { useStagedTap } from '@/composables/ui/staged-tap'
import { TYPE_SFX } from '@/sfx/config'

const { checked, theme = 'blue-500' } = defineProps<{
  checked: boolean
  intermediate?: boolean
  theme?: Theme
  inverted?: boolean
}>()

const { playing, tap } = useStagedTap({ triggerAt: 'press' })
const onCaptureClick = tap(undefined, { audio: 'ui.select' })
</script>

<template>
  <div
    data-testid="ui-kit-radio"
    :data-theme="theme"
    class="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-all duration-50"
    :class="{
      'border-none bg-(--theme-primary) outline-4 outline-white hover:scale-110': inverted,
      'border-2 border-(--theme-primary) bg-white hover:border-4 hover:border-white hover:bg-(--theme-primary)':
        !inverted,
      'bg-(--theme-primary) outline-4': checked && inverted,
      'border-4 border-white bg-(--theme-primary)!': checked && !inverted
    }"
    :data-playing="playing || null"
    v-sfx="{ hover: TYPE_SFX }"
    @click.capture="onCaptureClick"
  >
    <ui-icon v-if="checked" class="text-white" src="check" />
    <ui-icon v-if="intermediate" src="minus" />
  </div>
</template>
