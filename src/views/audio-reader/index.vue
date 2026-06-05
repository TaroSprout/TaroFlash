<script setup lang="ts">
import { computed } from 'vue'
import TranscriptView from './transcript/index.vue'
import TermPopover from './term-popover/index.vue'
import { useLessonReader } from '@/composables/audio-reader/use-lesson-reader'

// Translate into the app language. A per-member target language can replace this
// later; admin-only v1 is English.
const TARGET_LANG = 'English'

const { id } = defineProps<{ id: string }>()

const { lesson, paragraphs, audio_url, active_word, selection, popover_open, openTerm, closeTerm } =
  useLessonReader(computed(() => Number(id)))
</script>

<template>
  <div
    data-testid="audio-reader-lesson"
    class="mx-auto flex h-full w-full max-w-168 flex-col gap-6 pb-12"
  >
    <h1
      data-testid="audio-reader-lesson__title"
      class="text-3xl text-brown-700 dark:text-brown-300"
    >
      {{ lesson?.title }}
    </h1>

    <audio
      ref="audio"
      data-testid="audio-reader-lesson__audio"
      :src="audio_url ?? undefined"
      controls
      class="w-full"
    />

    <transcript-view
      :paragraphs="paragraphs"
      :active_word="active_word"
      :popover_open="popover_open"
      @select="openTerm"
    />

    <term-popover
      v-if="selection"
      :open="popover_open"
      :rect="selection.rect"
      :term="selection.term"
      :sentence="selection.sentence"
      :target_lang="TARGET_LANG"
      @close="closeTerm"
    />
  </div>
</template>
