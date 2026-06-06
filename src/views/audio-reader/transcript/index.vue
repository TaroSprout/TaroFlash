<script setup lang="ts">
import { computed } from 'vue'
import type { SentenceWords } from '@/utils/transcript'
import { useReaderHighlights } from '@/composables/audio-reader/use-reader-highlights'
import TranscriptSegment from './segment.vue'

const {
  paragraphs,
  active_word,
  popover_open = false
} = defineProps<{
  paragraphs: SentenceWords[][]
  active_word: number
  popover_open?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', selection: TermSelection): void
}>()

const { onPointerDown, onPointerMove, onPointerUp, onPointerLeave } = useReaderHighlights(
  () => active_word,
  commitSelection,
  () => popover_open
)

const sentences = computed(() => paragraphs.flat())

function sentenceIndexOf(node: Element): number | null {
  const segment = node.closest('[data-testid="transcript-segment"]')
  const index = segment?.getAttribute('data-index')
  return index === null || index === undefined ? null : Number(index)
}

// A committed word-range carries its own term + rect; the sentence it starts in
// (translator context) comes from the anchor word's segment.
function commitSelection({ term, rect, anchor }: { term: string; rect: DOMRect; anchor: Element }) {
  const index = sentenceIndexOf(anchor)
  const sentence = (index !== null && sentences.value[index]?.sentence) || term
  emit('select', { term, sentence, rect })
}
</script>

<template>
  <div data-testid="transcript-view" class="px-2 py-1">
    <div
      ref="content"
      data-testid="transcript-view__content"
      class="relative isolate flex select-none flex-col gap-7 text-4xl leading-[2.5] text-brown-700 dark:text-brown-200"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerLeave"
    >
      <div
        ref="playhead"
        data-testid="transcript-view__playhead"
        aria-hidden="true"
        class="pointer-events-none absolute left-0 top-0 -z-10 rounded-2 bg-(--theme-primary) opacity-0"
      />
      <div
        ref="hover"
        data-testid="transcript-view__hover"
        aria-hidden="true"
        class="pointer-events-none absolute left-0 top-0 -z-10 rounded-2 bg-(--theme-primary) opacity-0"
      />
      <div
        v-for="(paragraph, p) in paragraphs"
        :key="p"
        data-testid="transcript-view__paragraph"
        class="flex flex-col gap-3"
      >
        <transcript-segment
          v-for="sentence in paragraph"
          :key="sentence.index"
          :group="sentence"
          :index="sentence.index"
        />
      </div>
    </div>
  </div>
</template>
