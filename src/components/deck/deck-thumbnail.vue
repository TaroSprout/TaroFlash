<script setup lang="ts">
import Card from '@/components/card/index.vue'
import UiTappable from '@/components/ui-kit/tappable.vue'
import { TYPE_SFX } from '@/sfx/config'
import type { SfxOptions } from '@/sfx/directive'

type CardSize = InstanceType<typeof Card>['$props']['size']

type DeckThumbnailProps = {
  deck?: Deck
  size?: CardSize
  hide_title?: boolean
  sfx?: SfxOptions
}

const { deck, size = 'base', sfx } = defineProps<DeckThumbnailProps>()

const emit = defineEmits<{ press: [e: MouseEvent] }>()
</script>

<template>
  <ui-tappable
    as="div"
    data-testid="deck-thumbnail"
    class="card-outline pointer-fine:hover:scale-101 data-[active=true]:scale-101 pointer-coarse:data-[active=true]:scale-105 pointer-fine:transition-transform duration-75 relative cursor-pointer h-min touch-manipulation"
    :sfx="{ hover: TYPE_SFX, ...sfx }"
    @tap="emit('press', $event)"
  >
    <card side="cover" :size="size" :cover_config="deck?.cover_config" />

    <div
      v-if="!hide_title"
      class="absolute w-full -bottom-2.5 bg-brown-300 dark:bg-stone-700 p-4 rounded-5.5"
    >
      <slot name="actions"></slot>
      <h2 class="text-xl text-center text-brown-700 dark:text-brown-100">{{ deck?.title }}</h2>
    </div>
  </ui-tappable>
</template>
