<script setup lang="ts">
import { computed, provide } from 'vue'
import type { SentenceWords } from '@/utils/transcript'
import { markTermInSentence } from '@/utils/transcript'
import type { CardMatch } from '@/utils/transcript-match'
import {
  readerActiveWordKey,
  readerMatchesKey,
  readerSelectionKey,
  useReaderHighlights,
  type WordRange
} from '@/composables/audio-reader/reader-highlights'
import TranscriptSegment from './segment.vue'
import SelectionPreview from './selection-preview.vue'

type TranscriptViewProps = {
  paragraphs: SentenceWords[]
  chapters?: TranscriptChapter[]
  matches?: Map<number, CardMatch>
  active_word: number
  popover_open?: boolean
  is_playing?: boolean
}

const {
  paragraphs,
  chapters = [],
  matches = new Map(),
  active_word,
  popover_open = false,
  is_playing = false
} = defineProps<TranscriptViewProps>()

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
  following,
  follow_direction,
  resumeFollow,
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

// The follow state + resume action surface to the lesson view, which renders the
// "jump to current line" control in the mobile dock above the transcript.
defineExpose({ following, follow_direction, resumeFollow })

provide(readerSelectionKey, interaction_range)
provide(
  readerActiveWordKey,
  computed(() => active_word)
)
provide(
  readerMatchesKey,
  computed(() => matches)
)

// Maps paragraph.index → chapter title for the first paragraph of each chapter.
const chapter_headings = computed(() => {
  const map = new Map<number, string>()
  for (const chapter of chapters) {
    const first = paragraphs.find((p) => p.start >= chapter.start)
    if (first) map.set(first.index, chapter.title)
  }
  return map
})

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
  const paragraph = index !== null ? paragraphs.find((p) => p.index === index) : undefined
  const raw_sentence = paragraph?.sentence || term
  const words = paragraph?.words ?? []
  const sentence = markTermInSentence(raw_sentence, words, word_index, term)
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
      <template v-for="paragraph in paragraphs" :key="paragraph.index">
        <h2
          v-if="chapter_headings.get(paragraph.index)"
          data-testid="transcript-view__chapter-heading"
          class="text-xl font-medium text-brown-500 dark:text-brown-400 -mb-3 mt-4 first:mt-0"
        >
          {{ chapter_headings.get(paragraph.index) }}
        </h2>
        <transcript-segment :group="paragraph" :index="paragraph.index" />
      </template>
    </div>

    <selection-preview :preview="selection_preview" />
  </div>
</template>
