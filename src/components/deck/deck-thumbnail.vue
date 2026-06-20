<script setup lang="ts">
import Card from '@/components/card/index.vue'
import { useStagedTap } from '@/composables/ui/staged-tap'
import { TYPE_SFX, type SoundKey } from '@/sfx/config'

type CardSize = InstanceType<typeof Card>['$props']['size']

const {
  deck,
  size = 'base',
  click_sfx
} = defineProps<{
  deck?: Deck
  size?: CardSize
  hide_title?: boolean
  click_sfx?: SoundKey
}>()

const emit = defineEmits<{ press: [e: MouseEvent] }>()

const { playing, tap } = useStagedTap()

function onClick(e: MouseEvent) {
  tap((ev) => emit('press', ev), { audio: click_sfx })(e)
}
</script>

<template>
  <div
    data-testid="deck-thumbnail"
    class="card-outline pointer-fine:hover:scale-101 data-[playing=true]:scale-101 pointer-coarse:data-[playing=true]:scale-105 pointer-fine:transition-transform duration-75 relative cursor-pointer h-min touch-manipulation"
    :data-playing="playing || null"
    v-sfx="{ hover: TYPE_SFX }"
    @click="onClick"
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
