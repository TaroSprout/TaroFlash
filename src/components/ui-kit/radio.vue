<script setup lang="ts">
import UiIcon from '@/components/ui-kit/icon.vue'
import { useStagedTap } from '@/composables/ui/staged-tap'
import type { SfxOptions } from '@/sfx/directive'

const {
  checked,
  active = false,
  sfx = {}
} = defineProps<{
  checked: boolean
  intermediate?: boolean
  // externally forced active state — lets a caller mirror a hover/focus that
  // lands elsewhere in the DOM (eg. pointer-events-none over the radio itself)
  active?: boolean
  sfx?: SfxOptions
}>()

const { playing, tap } = useStagedTap({ triggerAt: 'press' })
const onClick = tap(undefined, {
  audio: sfx.press ?? 'select',
  audioOpts: { debounce: sfx.debounce }
})
</script>

<template>
  <div
    data-testid="ui-kit-radio"
    class="relative flex size-10 cursor-pointer items-center justify-center rounded-full transition-all duration-50 p-2.5 border-4 border-white dark:border-stone-900"
    :class="{
      'bg-(--theme-primary)! border-none': checked,
      'bg-white dark:bg-stone-900 hover:bg-(--theme-primary) data-[active=true]:bg-(--theme-primary)':
        !checked
    }"
    :data-active="playing || active || null"
    v-sfx="{ hover: sfx.hover, focus: sfx.focus, blur: sfx.blur, debounce: sfx.debounce }"
    @click="onClick"
  >
    <ui-icon v-if="checked" class="text-white" src="check" />
    <ui-icon v-if="intermediate" src="minus" />
  </div>
</template>
