<script setup lang="ts">
import { useAttrs } from 'vue'
import {
  type StagedTapAnimate,
  type StagedTapPhase,
  useStagedTap
} from '@/composables/ui/staged-tap'
import type { SfxOptions } from '@/sfx/directive'

type UiTappableProps = {
  as?: string
  animate?: StagedTapAnimate
  sfx?: SfxOptions
  triggerAt?: StagedTapPhase
  bgx_color?: string
}

const {
  as = 'button',
  animate = 'quiet',
  sfx = {},
  triggerAt,
  bgx_color = 'var(--theme-neutral)'
} = defineProps<UiTappableProps>()

const emit = defineEmits<{
  tap: [e: MouseEvent]
}>()

const attrs = useAttrs()
const { playing, tap } = useStagedTap({ animate, triggerAt })

function onCaptureClick(e: MouseEvent) {
  const handler = attrs.onClick as ((ev: MouseEvent) => void) | undefined
  tap(
    (ev) => {
      emit('tap', ev)
      handler?.(ev)
    },
    {
      preAudio: sfx.tap_pre,
      audio: sfx.press,
      audioOpts: { debounce: sfx.debounce, blocking: sfx.press_blocking },
      postAudio: sfx.tap_post,
      captureMode: true
    }
  )(e)
}
</script>

<template>
  <component
    :is="as"
    :data-playing="playing || null"
    class="group/tappable relative"
    v-sfx="{ hover: sfx.hover, focus: sfx.focus, blur: sfx.blur, debounce: sfx.debounce }"
    @click.capture="onCaptureClick"
  >
    <slot />
    <div
      class="absolute inset-0 rounded-[inherit] bgx-diagonal-stripes animation-safe:group-data-[playing=true]/tappable:bgx-slide pointer-events-none hidden group-data-[playing=true]/tappable:block"
      :style="{ '--bgx-fill': bgx_color }"
    />
  </component>
</template>
