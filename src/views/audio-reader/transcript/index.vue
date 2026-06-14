<script setup lang="ts">
import { computed, provide } from 'vue'
import type { SentenceWords } from '@/utils/transcript'
import type { CardMatch } from '@/utils/transcript-match'
import {
  readerActiveWordKey,
  readerMatchesKey,
  readerSelectionKey,
  useReaderHighlights,
  type WordRange
} from '@/composables/audio-reader/use-reader-highlights'
import TranscriptSegment from './segment.vue'
import SelectionPreview from './selection-preview.vue'

const {
  paragraphs,
  matches = new Map(),
  active_word,
  popover_open = false,
  is_playing = false
} = defineProps<{
  paragraphs: SentenceWords[]
  matches?: Map<number, CardMatch>
  active_word: number
  popover_open?: boolean
  is_playing?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', selection: TermSelection): void
  (e: 'dismiss'): void
}>()

const {
  hover_lines,
  setHoverEl,
  tap_active,
  interaction_range,
  selection_preview,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onPointerCancel
} = useReaderHighlights(
  () => active_word,
  commitSelection,
  () => popover_open,
  () => emit('dismiss'),
  matchRangeAt,
  () => is_playing
)

provide(readerSelectionKey, interaction_range)
provide(
  readerActiveWordKey,
  computed(() => active_word)
)
provide(
  readerMatchesKey,
  computed(() => matches)
)

// A tap/click on a word inside a card match selects the whole matched phrase;
// null for an unmatched word, so the caller falls back to single-word select.
function matchRangeAt(index: number): WordRange | null {
  const match = matches.get(index)
  return match ? { lo: match.lo, hi: match.hi } : null
}

function paragraphIndexOf(node: Element): number | null {
  const segment = node.closest('[data-testid="transcript-segment"]')
  const index = segment?.getAttribute('data-index')
  return index === null || index === undefined ? null : Number(index)
}

// A committed word-range carries its own term + rect + first/last word indices;
// the surrounding text (translator context) is the whole paragraph the anchor
// word sits in.
function commitSelection({
  term,
  rect,
  anchor,
  index: word_index,
  end_index: word_end_index
}: {
  term: string
  rect: DOMRect
  anchor: Element
  index: number
  end_index: number
}) {
  const index = paragraphIndexOf(anchor)
  const sentence = (index !== null && paragraphs[index]?.sentence) || term
  emit('select', { term, sentence, rect, word_index, word_end_index })
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
        v-for="(_, i) in hover_lines"
        :key="i"
        :ref="(el) => setHoverEl(el as HTMLElement | null, i)"
        data-testid="transcript-view__hover"
        aria-hidden="true"
        :data-playing="tap_active"
        class="group/pill pointer-events-none absolute left-0 top-0 -z-10 rounded-2 bg-blue-500 opacity-0 dark:bg-blue-650"
      >
        <div
          data-testid="transcript-view__hover-texture"
          class="absolute inset-0 hidden rounded-2 bgx-diagonal-stripes animation-safe:bgx-slide bgx-color-[currentColor] group-data-[playing=true]/pill:block"
        />
      </div>
      <transcript-segment
        v-for="paragraph in paragraphs"
        :key="paragraph.index"
        :group="paragraph"
        :index="paragraph.index"
      />
    </div>

    <selection-preview :preview="selection_preview" />
  </div>
</template>
