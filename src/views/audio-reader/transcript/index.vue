<script setup lang="ts">
import { computed, provide, watch } from 'vue'
import type { SentenceWords } from '@/utils/transcript'
import { markTermInSentence } from '@/utils/transcript'
import type { CardMatch } from '@/utils/transcript-match'
import {
  readerActiveWordKey,
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
  content,
  hover_lines,
  setHoverEl,
  tap_active,
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

provide(
  readerActiveWordKey,
  computed(() => active_word)
)

// Leading / trailing punctuation edges — strip these from the first/last word of
// a match so the underline hugs the term's own characters and never bridges a
// comma or bracket to a neighbouring card.
const LEADING_EDGE = /^[\p{P}\s]+/u
const TRAILING_EDGE = /[\p{P}\s]+$/u

// Paint card-match highlights onto word elements imperatively rather than via
// reactive inject. With large transcripts (1000+ words) the inject chain caused
// every word to re-render whenever `matches` got a new Map reference — e.g. each
// time Pinia Colada re-fetched decks after the term card mounted. Painting
// data-highlight + data-theme + the lead/core/trail underline split directly
// bypasses Vue's scheduler entirely for this update path.
function paintMatchedWords(m: Map<number, CardMatch>) {
  const container = content.value
  if (!container) return

  // Build a word-index → element index in one DOM pass so lookups are O(1).
  const els = new Map<number, HTMLElement>()
  container.querySelectorAll<HTMLElement>('[data-word-index]').forEach((el) => {
    els.set(Number(el.dataset.wordIndex), el)
  })

  // Clear previously highlighted words.
  container.querySelectorAll<HTMLElement>('[data-highlight]').forEach((el) => {
    el.removeAttribute('data-highlight')
    el.removeAttribute('data-theme')
    el.removeAttribute('data-theme-dark')
    const base = el.querySelector<HTMLElement>('[data-word-base]')
    if (base) base.textContent = el.dataset.wordText ?? ''
  })

  // Apply each match: set theme attributes on the ruby element and rebuild the
  // base span with [lead][underlined core][trail] text nodes.
  for (const [index, match] of m) {
    const el = els.get(index)
    if (!el) continue

    const display = el.dataset.wordText ?? ''
    const lead = index === match.lo ? (display.match(LEADING_EDGE)?.[0] ?? '') : ''
    const trail = index === match.hi ? (display.match(TRAILING_EDGE)?.[0] ?? '') : ''
    const core = display.slice(lead.length, display.length - trail.length)

    el.setAttribute('data-highlight', 'true')
    if (match.theme) el.setAttribute('data-theme', match.theme)
    if (match.theme_dark) el.setAttribute('data-theme-dark', match.theme_dark)

    const base = el.querySelector<HTMLElement>('[data-word-base]')
    if (!base) continue
    base.textContent = ''
    if (lead) base.appendChild(document.createTextNode(lead))
    const core_span = document.createElement('span')
    core_span.className =
      'underline decoration-(--theme-primary) decoration-3 underline-offset-[0.18em]'
    core_span.textContent = core
    base.appendChild(core_span)
    if (trail) base.appendChild(document.createTextNode(trail))
  }
}

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

watch(() => matches, paintMatchedWords, { immediate: true, flush: 'post' })
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
        <div
          v-if="chapter_headings.get(paragraph.index)"
          data-testid="transcript-view__chapter-heading"
          class="mt-32 flex flex-col items-center gap-3 first:mt-0"
        >
          <h2 class="text-xl font-medium text-brown-500 dark:text-brown-400">
            {{ chapter_headings.get(paragraph.index) }}
          </h2>
          <hr class="w-16 border-brown-700 dark:border-brown-700" />
        </div>
        <transcript-segment :group="paragraph" :index="paragraph.index" />
      </template>
    </div>

    <selection-preview :preview="selection_preview" />
  </div>
</template>
