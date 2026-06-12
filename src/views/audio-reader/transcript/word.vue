<script setup lang="ts">
import { computed, inject } from 'vue'
import {
  readerActiveWordKey,
  readerSelectionKey
} from '@/composables/audio-reader/use-reader-highlights'

const { display, index, reading } = defineProps<{
  display: string
  index: number
  reading?: string
}>()

const selection = inject(readerSelectionKey, null)
const active_word = inject(readerActiveWordKey, null)

const selected = computed(() => {
  const range = selection?.value
  return !!range && index >= range.lo && index <= range.hi
})

const playing = computed(() => active_word?.value === index)

// Selection wins over the audio cue: a selected word sits on the blue pill and
// needs white text to stay legible, even while it's the word being read.
const text_color = computed(() => {
  if (selected.value) return 'text-white'
  if (playing.value) return 'text-blue-500 dark:text-blue-650'
  return ''
})
</script>

<template>
  <ruby
    data-testid="transcript-word"
    :data-word-index="index"
    :data-word-text="display"
    :data-active="selected"
    :data-playing="playing"
    class="group/word cursor-pointer transition-colors duration-700 ease-out data-[playing=true]:duration-100 data-[active=true]:duration-100"
    :class="text_color"
    ><span
      data-word-base
      class="inline-block origin-center leading-none transition-transform duration-700 ease-out group-data-[playing=true]/word:scale-115 group-data-[playing=true]/word:duration-100"
      >{{ display }}</span
    ><rt
      v-if="reading"
      data-testid="transcript-word__reading"
      class="-translate-y-1 select-none text-base text-brown-500 dark:text-grey-400"
      >{{ reading }}</rt
    ></ruby
  >
</template>
