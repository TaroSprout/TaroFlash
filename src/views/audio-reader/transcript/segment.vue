<script setup lang="ts">
import type { SentenceWords } from '@/utils/transcript'
import TranscriptWord from './word.vue'

const { group, index } = defineProps<{
  group: SentenceWords
  index: number
}>()
</script>

<template>
  <div data-testid="transcript-segment" :data-index="index">
    <span data-testid="transcript-segment__source"
      ><transcript-word
        v-for="word in group.words"
        :key="word.index"
        :display="word.display"
        :index="word.index"
        :reading="word.reading"
    /></span>
    <span
      v-if="group.translation"
      data-testid="transcript-segment__translation"
      class="mt-1 block text-lg text-brown-500 dark:text-brown-300"
      >{{ group.translation }}</span
    >
  </div>
</template>
