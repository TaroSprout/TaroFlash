<script setup lang="ts">
import {
  type StagedTapAnimate,
  type StagedTapPhase,
  useStagedTap
} from '@/composables/use-staged-tap'
import type { NamespacedAudioKey } from '@/sfx/config'

type UiTappableProps = {
  as?: string
  animate?: StagedTapAnimate
  press_audio?: NamespacedAudioKey
  triggerAt?: StagedTapPhase
  bgx_color?: string
}

const {
  as = 'button',
  animate = 'quiet',
  press_audio,
  triggerAt,
  bgx_color = 'var(--theme-neutral)'
} = defineProps<UiTappableProps>()

const emit = defineEmits<{
  tap: [e: MouseEvent]
}>()

const { playing, tap } = useStagedTap({ animate, triggerAt })

const handler = tap((e) => emit('tap', e), { pressAudio: press_audio })
</script>

<template>
  <component
    :is="as"
    :data-playing="playing || null"
    class="group/tappable relative"
    @click="handler"
  >
    <slot />
    <div
      class="absolute inset-0 rounded-[inherit] bgx-diagonal-stripes animation-safe:group-data-[playing=true]/tappable:bgx-slide pointer-events-none hidden group-data-[playing=true]/tappable:block"
      :style="{ '--ui-tappable-bgx': bgx_color }"
    />
  </component>
</template>
