<script setup lang="ts">
import { ref } from 'vue'
import {
  type StagedTapAnimate,
  type StagedTapPhase,
  useStagedTap
} from '@/composables/ui/staged-tap'
import { useMatchMedia } from '@/composables/ui/media-query'
import type { SfxOptions } from '@/sfx/directive'

type UiTappableProps = {
  as?: string
  animate?: StagedTapAnimate
  sfx?: SfxOptions
  triggerAt?: StagedTapPhase
  bgx_color?: string
  // false drops the diagonal-stripe bgx layer entirely — for tappables whose
  // rounded children would let the square bgx bleed past the corners
  bgx?: boolean
  active_on_hover?: boolean
  // persistent selected/active state — shows the bgx background + slide,
  // same as hover/press but held open
  active?: boolean
}

const {
  as = 'button',
  animate = 'quiet',
  sfx = {},
  triggerAt,
  bgx_color = 'var(--color-element)',
  bgx = true,
  active_on_hover = false,
  active = false
} = defineProps<UiTappableProps>()

const emit = defineEmits<{
  tap: [e: MouseEvent]
}>()

const { playing, tap } = useStagedTap({ animate, triggerAt })
const is_fine = useMatchMedia('fine')
const hovering = ref(false)

function onClick(e: MouseEvent) {
  tap((ev) => emit('tap', ev), {
    preAudio: sfx.tap_pre,
    audio: sfx.press,
    audioOpts: { debounce: sfx.debounce },
    postAudio: sfx.tap_post
  })(e)
}

function onPointerEnter() {
  if (active_on_hover && is_fine.value) hovering.value = true
}

function onPointerLeave() {
  hovering.value = false
}
</script>

<template>
  <component
    :is="as"
    :data-tap-active="playing || hovering || active || null"
    class="group/tappable relative isolate"
    v-sfx="{ hover: sfx.hover, focus: sfx.focus, blur: sfx.blur, debounce: sfx.debounce }"
    @pointerenter="onPointerEnter"
    @pointerleave="onPointerLeave"
    @click="onClick"
  >
    <slot />
    <div
      v-if="bgx"
      class="absolute inset-0 -z-10 rounded-[inherit] bgx-diagonal-stripes animation-safe:group-data-[tap-active=true]/tappable:bgx-slide pointer-events-none hidden group-data-[tap-active=true]/tappable:block"
      :style="{ '--bgx-fill': bgx_color }"
    />
  </component>
</template>
