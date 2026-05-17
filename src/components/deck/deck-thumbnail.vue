<script setup lang="ts">
import { useAttrs } from 'vue'
import Card from '@/components/card/index.vue'
import { usePlayOnTap } from '@/composables/use-play-on-tap'
import { emitSfx } from '@/sfx/bus'
import type { NamespacedAudioKey } from '@/sfx/config'

type CardSize = InstanceType<typeof Card>['$props']['size']

const {
  deck,
  size = 'base',
  click_sfx
} = defineProps<{
  deck?: Deck
  size?: CardSize
  hide_title?: boolean
  click_sfx?: NamespacedAudioKey
}>()

const attrs = useAttrs()

const { playing, interceptClick } = usePlayOnTap({ animate: false })

function onCaptureClick(e: MouseEvent) {
  const handler = attrs.onClick as ((ev: MouseEvent) => void) | undefined

  if (!handler) return

  interceptClick(e, {
    beforePlay: () => {
      if (click_sfx) emitSfx(click_sfx)
    },
    onAfter: handler
  })
}
</script>

<template>
  <div
    data-testid="deck-thumbnail"
    class="card-outline pointer-fine:hover:scale-101 data-[playing=true]:scale-101 pointer-coarse:data-[playing=true]:scale-105 pointer-fine:transition-transform duration-75 relative cursor-pointer h-min touch-manipulation"
    :data-playing="playing || null"
    v-sfx.hover="'ui.click_07'"
    @click.capture="onCaptureClick"
  >
    <card side="cover" :size="size" :cover_config="deck?.cover_config" />

    <div
      v-if="!hide_title"
      class="absolute w-full -bottom-2.5 bg-brown-300 dark:bg-stone-700 p-4 rounded-5.5"
    >
      <slot name="actions"></slot>
      <h2 class="text-xl text-center text-brown-700 dark:text-brown-100">{{ deck?.title }}</h2>
    </div>
  </div>
</template>
