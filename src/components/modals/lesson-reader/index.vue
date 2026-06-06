<script setup lang="ts">
import { computed } from 'vue'
import MobileSheet from '@/components/layout-kit/modal/mobile-sheet.vue'
import TranscriptView from '@/views/audio-reader/transcript/index.vue'
import TermPopover from '@/views/audio-reader/term-popover/index.vue'
import { useLessonReader } from '@/composables/audio-reader/use-lesson-reader'

export type LessonReaderResponse = void

// Translate into the app language. A per-member target language can replace this
// later; admin-only v1 is English.
const TARGET_LANG = 'English'

const { id } = defineProps<{
  id: number
  close: (response?: LessonReaderResponse) => void
}>()

const { lesson, paragraphs, audio_url, active_word, selection, popover_open, openTerm, closeTerm } =
  useLessonReader(computed(() => id))
</script>

<template>
  <mobile-sheet
    data-testid="lesson-reader-container"
    data-theme="blue-500"
    data-theme-dark="blue-650"
    class="max-h-[90dvh] sm:w-180"
    :title="lesson?.title"
    @close="close()"
  >
    <div
      data-testid="lesson-reader__transcript"
      class="max-h-[70dvh] overflow-y-auto px-6 pt-6 pb-2"
    >
      <transcript-view
        :paragraphs="paragraphs"
        :active_word="active_word"
        :popover_open="popover_open"
        @select="openTerm"
      />
    </div>

    <term-popover
      v-if="selection"
      :open="popover_open"
      :rect="selection.rect"
      :term="selection.term"
      :sentence="selection.sentence"
      :target_lang="TARGET_LANG"
      @close="closeTerm"
    />

    <template #footer>
      <div
        data-testid="lesson-reader__audio-bar"
        class="border-t border-brown-300 px-6 pt-2 pb-6 dark:border-grey-700"
      >
        <audio
          ref="audio"
          data-testid="lesson-reader__audio"
          :src="audio_url ?? undefined"
          controls
          class="w-full"
        />
      </div>
    </template>
  </mobile-sheet>
</template>
