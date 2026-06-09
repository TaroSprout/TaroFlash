<script setup lang="ts">
import type { SentenceWords } from '@/utils/transcript'
import { useReaderHighlights } from '@/composables/audio-reader/use-reader-highlights'
import TranscriptSegment from './segment.vue'

const {
  paragraphs,
  active_word,
  popover_open = false
} = defineProps<{
  paragraphs: SentenceWords[]
  active_word: number
  popover_open?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', selection: TermSelection): void
}>()

const { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onPointerCancel } =
  useReaderHighlights(
    () => active_word,
    commitSelection,
    () => popover_open
  )

function paragraphIndexOf(node: Element): number | null {
  const segment = node.closest('[data-testid="transcript-segment"]')
  const index = segment?.getAttribute('data-index')
  return index === null || index === undefined ? null : Number(index)
}

// A committed word-range carries its own term + rect; the surrounding text
// (translator context) is the whole paragraph the anchor word sits in.
function commitSelection({ term, rect, anchor }: { term: string; rect: DOMRect; anchor: Element }) {
  const index = paragraphIndexOf(anchor)
  const sentence = (index !== null && paragraphs[index]?.sentence) || term
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
      @pointercancel="onPointerCancel"
    >
      <div
        ref="sentence"
        data-testid="transcript-view__sentence"
        aria-hidden="true"
        class="pointer-events-none absolute left-0 top-0 -z-20 rounded-4 bg-brown-300 opacity-0 dark:bg-grey-700"
      />
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
      <transcript-segment
        v-for="paragraph in paragraphs"
        :key="paragraph.index"
        :group="paragraph"
        :index="paragraph.index"
      />
    </div>
  </div>
</template>
