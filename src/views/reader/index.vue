<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  useTemplateRef,
  watch
} from 'vue'
import { useLessonReader, lessonReaderKey } from './composables/lesson-reader'
import { useReaderProgress } from './composables/reader-progress'
import { usePagination } from './composables/pagination'
import { usePageAudioSync } from './composables/reader-sync'
import { useResizeFreeze } from './composables/resize-freeze'
import { useWordSelection, type WordRange } from '@/composables/audio-reader/word-selection'
import { isTwoPage, pageWidth, spreadCount, spreadOfPage } from '@/utils/reader/spread'
import { pageSlices } from '@/utils/reader/slices'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import BookMeasure from './book-measure.vue'
import PageStrip from './page-strip.vue'
import ReaderPage from './page.vue'
import ReaderControls from './controls.vue'
import ReaderSettings from './reader-settings.vue'
import ReaderSkeleton from './skeleton.vue'
import TranslationBand from './translation-band.vue'
import TermSheet from './term-popover/term-sheet.vue'

type ReaderProps = {
  collectionId: string
  lessonId: string
}

const { collectionId, lessonId } = defineProps<ReaderProps>()

const PAGE_TOP = 'pt-8 sm:pt-20'
const RESERVE_CONTROLS = 'pb-[calc(var(--reader-controls-h)+var(--reader-feather))]'
const RIGHT_PAGE_X = 'pl-0 pr-5 sm:pr-14 lg:pr-20'
// Reserve the active band up to this fraction of the page — a runaway translation
// scrolls inside its band rather than eating the whole page.
const SPLIT_CAP_RATIO = 0.4

const collection_id = computed(() => Number(collectionId))
const lesson_id = computed(() => Number(lessonId))

const reader = useLessonReader(lesson_id)
provide(lessonReaderKey, reader)

const {
  lesson,
  paragraphs,
  matches,
  audio_url,
  active_word,
  selection,
  popover_open,
  target_lang,
  selected_term_decks,
  openTerm,
  closeTerm,
  playFromHere,
  playClip,
  seekToWord,
  player
} = reader

const { restored } = useReaderProgress(collection_id, lesson_id, player)

const viewport = useTemplateRef<HTMLElement>('viewport')
const surface = useTemplateRef<HTMLElement>('surface')
const frame_reduced = useTemplateRef<HTMLElement>('frame_reduced')
const frame_full = useTemplateRef<HTMLElement>('frame_full')
const measure = useTemplateRef<InstanceType<typeof BookMeasure>>('measure')
const strip = useTemplateRef<InstanceType<typeof PageStrip>>('strip')

const settings_open = ref(false)
const reduced_height = ref(0)
const full_height = ref(0)
const measure_width = ref(0)

let frame_ro: ResizeObserver | undefined

const { viewport_width, viewport_height, frozen } = useResizeFreeze({ viewport, surface })

const two_page = computed(() => isTwoPage(viewport_width.value))
const page_width = computed(() => pageWidth(viewport_width.value, two_page.value))
const split_cap = computed(() => Math.round(viewport_height.value * SPLIT_CAP_RATIO))

// Two-page primary keeps only its outer margin (the gutter runs to the spine); a
// single page is symmetric. Frames measure at the primary column so the wrap
// width matches what the rendered page lays words out in.
const primary_x = computed(() =>
  two_page.value ? 'pl-5 pr-0 sm:pl-14 lg:pl-20' : 'px-5 sm:px-14 lg:px-20'
)
const primary_page_class = computed(() => `${PAGE_TOP} ${primary_x.value}`)
const frame_reduced_class = computed(() => `${PAGE_TOP} ${RESERVE_CONTROLS} ${primary_x.value}`)
const frame_full_class = computed(() => `${PAGE_TOP} ${primary_x.value}`)

const { pages, page_count, pageFootprints, pageIndexOfWord } = usePagination({
  words: () => measure.value?.words ?? [],
  bandHeightOf: (paragraph_index) => measure.value?.bandHeightOf(paragraph_index) ?? 0,
  split_mode: true,
  two_page: () => two_page.value,
  reduced_height: () => reduced_height.value,
  full_height: () => full_height.value,
  split_cap: () => split_cap.value
})

const { desired_spread, onTurn } = usePageAudioSync({
  is_playing: () => player.is_playing.value,
  active_word: () => active_word.value,
  at_rest: () => strip.value?.at_rest ?? true,
  spreadOfWord,
  firstWordOfSpread,
  seekToWord
})

const selectionApi = useWordSelection({
  content: viewport,
  active_word: () => active_word.value,
  paragraphs: () => paragraphs.value,
  onSelect: openTerm,
  onDismiss: closeTerm,
  popover_open: () => popover_open.value,
  matchRangeAt
})

const spread_count = computed(() => spreadCount(page_count.value, two_page.value))

const primary_page_index = computed(() =>
  two_page.value ? desired_spread.value * 2 : desired_spread.value
)

const current_footprint = computed(() => pageFootprints.value[primary_page_index.value] ?? 0)

const active_paragraph = computed(() => {
  if (active_word.value < 0) return null
  return paragraphs.value.find((p) => p.words.some((w) => w.index === active_word.value)) ?? null
})

const active_translation = computed(() => active_paragraph.value?.translation ?? null)

// The active paragraph's full band overflows its reserved footprint — read it from
// the top and let it scroll, rather than centring a clipped block.
const active_overflowing = computed(() => {
  const paragraph = active_paragraph.value
  if (!paragraph) return false
  return (measure.value?.bandHeightOf(paragraph.index) ?? 0) > current_footprint.value
})

// Veil the reader until the lesson is in, its resume point applied, and the first
// pages have been laid out — so the reveal shows a finished page, not a reflow.
const show_skeleton = computed(() => !lesson.value || !restored.value || page_count.value === 0)

onMounted(() => {
  frame_ro = new ResizeObserver(onFrameResize)
  if (frame_reduced.value) frame_ro.observe(frame_reduced.value)
  if (frame_full.value) frame_ro.observe(frame_full.value)
})

onBeforeUnmount(() => frame_ro?.disconnect())

function onFrameResize() {
  if (frozen.value) return
  measureFrames()
}

async function reflowFrames() {
  await nextTick()
  measureFrames()
}

function measureFrames() {
  if (frame_reduced.value) reduced_height.value = frame_reduced.value.clientHeight

  if (!frame_full.value) return
  full_height.value = frame_full.value.clientHeight
  measure_width.value = frame_full.value.clientWidth
}

function spreadOfWord(word_index: number): number {
  if (word_index < 0) return desired_spread.value
  const page_index = pageIndexOfWord(word_index)
  return spreadOfPage(page_index, two_page.value)
}

function firstWordOfSpread(spread: number): number | undefined {
  const page_index = two_page.value ? spread * 2 : spread
  return pages.value[page_index]?.word_start_index
}

function slicesForPage(page_index: number) {
  const page = pages.value[page_index]
  if (!page) return []
  return pageSlices(paragraphs.value, page.word_start_index, page.word_end_index)
}

function matchRangeAt(index: number): WordRange | null {
  const match = matches.value.get(index)
  return match ? { lo: match.lo, hi: match.hi } : null
}

watch([viewport_width, viewport_height], reflowFrames)
</script>

<template>
  <section
    data-testid="reader"
    class="relative flex h-[calc(100dvh-var(--nav-height))] w-full flex-col overflow-hidden bg-surface px-(--page-px) pb-4"
    style="--reader-controls-h: 3.5rem; --reader-feather: 3.5rem"
  >
    <div
      ref="viewport"
      data-testid="reader__viewport"
      class="relative min-h-0 flex-1 overflow-hidden"
      @pointerdown="selectionApi.onPointerDown"
      @pointermove="selectionApi.onPointerMove"
      @pointerup="selectionApi.onPointerUp"
      @pointerleave="selectionApi.onPointerLeave"
      @pointercancel="selectionApi.onPointerCancel"
    >
      <div
        aria-hidden="true"
        data-testid="reader__frame-reduced"
        class="pointer-events-none invisible absolute inset-y-0 left-0 flex flex-col"
        :class="frame_reduced_class"
        :style="{ width: `${page_width}px` }"
      >
        <div ref="frame_reduced" class="min-h-0 flex-1"></div>
      </div>

      <div
        aria-hidden="true"
        data-testid="reader__frame-full"
        class="pointer-events-none invisible absolute inset-y-0 left-0 flex flex-col"
        :class="frame_full_class"
        :style="{ width: `${page_width}px` }"
      >
        <div ref="frame_full" class="min-h-0 flex-1"></div>
      </div>

      <book-measure ref="measure" :paragraphs="paragraphs" :width="measure_width" />

      <div ref="surface" data-testid="reader__surface" class="absolute inset-0">
        <page-strip
          ref="strip"
          :page-count="page_count"
          :two-page="two_page"
          :viewport-width="viewport_width"
          :spread="desired_spread"
          @turn="onTurn"
        >
          <template #default="{ pageIndex, primary }">
            <div
              class="h-full"
              :class="primary ? primary_page_class : `${PAGE_TOP} ${RIGHT_PAGE_X}`"
            >
              <reader-page :slices="slicesForPage(pageIndex)" />
            </div>
          </template>
        </page-strip>
      </div>

      <div
        data-testid="reader__dock"
        class="absolute bottom-0 left-0 z-20 flex flex-col"
        :class="primary_x"
        :style="{ width: `${page_width}px` }"
      >
        <div
          aria-hidden="true"
          class="reader-dock-surface absolute bottom-0 left-0 -z-10 bg-surface"
          :style="{
            top: 'calc(var(--reader-feather) * -1)',
            right: 'calc(var(--reader-feather) * -1)'
          }"
        />

        <translation-band
          :height="current_footprint"
          :translation="active_translation"
          :overflowing="active_overflowing"
        />

        <div data-testid="reader__controls" class="flex h-(--reader-controls-h) items-center">
          <reader-controls :player="player" @open-settings="settings_open = true" />
        </div>
      </div>

      <transition :css="false" @leave="fadeLeave">
        <reader-skeleton
          v-if="show_skeleton"
          data-testid="reader__skeleton"
          class="absolute inset-0 z-30 bg-surface"
        />
      </transition>
    </div>

    <term-sheet
      :selection="selection"
      :open="popover_open"
      :target-lang="target_lang"
      :existing-decks="selected_term_decks"
      @close="closeTerm"
      @play-from-here="playFromHere"
      @play-word="playClip"
    />

    <transition :css="false" @enter="fadeEnter" @leave="fadeLeave">
      <div
        v-if="settings_open"
        data-testid="reader__settings"
        class="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
      >
        <div class="absolute inset-0 bg-ink/20" @pointerdown.self="settings_open = false" />
        <div
          data-station="float"
          class="relative max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-7 bg-surface px-(--dock-px) pt-(--dock-pt) shadow-lg ring-1 ring-line sm:rounded-7"
        >
          <reader-settings :player="player" @close="settings_open = false" />
        </div>
      </div>
    </transition>

    <audio ref="audio" data-testid="reader__audio" :src="audio_url ?? undefined" class="hidden" />
  </section>
</template>

<style scoped>
.reader-dock-surface {
  -webkit-mask-image:
    linear-gradient(to bottom, transparent, #000 var(--reader-feather)),
    linear-gradient(to left, transparent, #000 var(--reader-feather));
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(to bottom, transparent, #000 var(--reader-feather)),
    linear-gradient(to left, transparent, #000 var(--reader-feather));
  mask-composite: intersect;
}
</style>
