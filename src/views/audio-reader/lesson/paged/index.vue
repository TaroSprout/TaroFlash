<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch
} from 'vue'
import { lessonReaderKey } from '@/composables/audio-reader/lesson-reader'
import { useReaderPrefs } from '@/composables/audio-reader/reader-prefs'
import { usePagination } from '@/composables/audio-reader/pagination'
import { usePagedSelection, type WordRange } from '@/composables/audio-reader/paged-selection'
import { useMatchMedia } from '@/composables/ui/media-query'
import { resizeBand, setBand, setPageTrack, settlePageTrack } from '@/utils/animations/paged-reader'
import { fadeEnter, fadeLeave } from '@/utils/animations/fade'
import PagedPage from '@/views/audio-reader/lesson/paged/page.vue'
import PagedSegment from '@/views/audio-reader/lesson/paged/segment.vue'
import PagedControls from '@/views/audio-reader/lesson/paged/controls.vue'
import PagedTermSheet from '@/views/audio-reader/lesson/paged/term-sheet.vue'
import ReaderSettings from '@/views/audio-reader/lesson/reader-settings.vue'
import ResumeFollowButton from '@/views/audio-reader/lesson/resume-follow-button.vue'

const SPREAD_GAP = 40
const RESERVE_CONTROLS = 'pb-[calc(var(--paged-controls-h)+var(--paged-feather))]'
const PAGE_TOP = 'pt-16 sm:pt-20'
const PAGE_BOTTOM = 'pb-16 sm:pb-20'
const SPLIT_CAP_RATIO = 0.4
const TURN_RATIO = 0.22
const TAP_SLOP = 8
const DECIDE_SLOP = 10

const reader = inject(lessonReaderKey)!
const {
  paragraphs,
  matches,
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

const { display_mode } = useReaderPrefs()

const viewport = useTemplateRef<HTMLElement>('viewport')
const track = useTemplateRef<HTMLElement>('track')
const measure_host = useTemplateRef<HTMLElement>('measure')
const frame_reduced = useTemplateRef<HTMLElement>('frame_reduced')
const frame_full = useTemplateRef<HTMLElement>('frame_full')
const band_measure = useTemplateRef<HTMLElement>('band_measure')
const band_el = useTemplateRef<HTMLElement>('band_el')

const viewport_w = ref(0)
const viewport_h = ref(0)
const reduced_height = ref(0)
const full_height = ref(0)
const measure_width = ref(0)
const band_heights = ref<Map<number, number>>(new Map())
const band_version = ref(0)

const current_index = ref(0)
const following = ref(true)
const settings_open = ref(false)

let start_x = 0
let start_y = 0
let pointer_down = false
let pointer_id = -1
let captured = false
let dragging = false
let decided: 'swipe' | 'scroll' | null = null
let band_primed = false
let turning = false

let viewport_ro: ResizeObserver | undefined
let frame_ro: ResizeObserver | undefined
let band_ro: ResizeObserver | undefined

const gloss_mode = computed(() => display_mode.value === 'inline')
const split_mode = computed(() => display_mode.value === 'fixed')
const two_page = useMatchMedia('w>=xl')
const pages_per_spread = computed(() => (two_page.value ? 2 : 1))
const split_cap = computed(() => Math.round(viewport_h.value * SPLIT_CAP_RATIO))

const page_width = computed(() =>
  two_page.value ? Math.max(0, (viewport_w.value - SPREAD_GAP) / 2) : viewport_w.value
)

const primary_x = computed(() =>
  two_page.value ? 'pl-10 pr-0 sm:pl-14 lg:pl-20' : 'px-10 sm:px-14 lg:px-20'
)

const primary_page_class = computed(() => `${PAGE_TOP} ${primary_x.value}`)
const frame_reduced_class = computed(() => `${PAGE_TOP} ${primary_x.value} ${RESERVE_CONTROLS}`)
const right_page_class = `${PAGE_TOP} ${PAGE_BOTTOM} pl-0 pr-10 sm:pr-14 lg:pr-20`
const frame_full_class = computed(() => `${PAGE_TOP} ${PAGE_BOTTOM} ${primary_x.value}`)

const { pages, pageIndexOfWord, pageFootprint } = usePagination({
  measure_host,
  paragraphs: () => paragraphs.value,
  gloss_mode: () => gloss_mode.value,
  split_mode: () => split_mode.value,
  two_page: () => two_page.value,
  reduced_height: () => reduced_height.value,
  full_height: () => full_height.value,
  bandHeightOf,
  split_cap: () => split_cap.value,
  revalidate: () => [
    reduced_height.value,
    full_height.value,
    two_page.value,
    split_mode.value,
    split_cap.value,
    band_version.value
  ]
})

const selectionApi = usePagedSelection(
  viewport,
  () => active_word.value,
  () => paragraphs.value,
  matchRangeAt,
  openTerm,
  closeTerm,
  () => popover_open.value
)

const spread_count = computed(() =>
  Math.max(1, Math.ceil(pages.value.length / pages_per_spread.value))
)

const slots = computed(() => [
  current_index.value - 1,
  current_index.value,
  current_index.value + 1
])

const primary_page_index = computed(() =>
  two_page.value ? current_index.value * 2 : current_index.value
)

const current_footprint = computed(() => pageFootprint.value[primary_page_index.value] ?? 0)

const active_paragraph = computed(() => {
  if (active_word.value < 0) return null
  return paragraphs.value.find((p) => p.words.some((w) => w.index === active_word.value)) ?? null
})

const active_translation = computed(() => active_paragraph.value?.translation ?? null)

const active_overflows = computed(() => {
  if (!split_mode.value || !active_paragraph.value) return false
  return bandHeightOf(active_paragraph.value.index) > current_footprint.value
})

const resume_direction = computed<'up' | 'down'>(() =>
  spreadOfWord(active_word.value) < current_index.value ? 'up' : 'down'
)

onMounted(() => {
  viewport_ro = new ResizeObserver(measureViewport)
  if (viewport.value) viewport_ro.observe(viewport.value)

  frame_ro = new ResizeObserver(measureFrames)
  if (frame_reduced.value) frame_ro.observe(frame_reduced.value)
  if (frame_full.value) frame_ro.observe(frame_full.value)

  band_ro = new ResizeObserver(measureBands)
  if (band_measure.value) band_ro.observe(band_measure.value)

  measureBands()
  recenter()
})

onBeforeUnmount(() => {
  viewport_ro?.disconnect()
  frame_ro?.disconnect()
  band_ro?.disconnect()
})

function measureViewport() {
  if (!viewport.value) return
  viewport_w.value = viewport.value.clientWidth
  viewport_h.value = viewport.value.clientHeight
  if (!dragging) recenter()
}

function measureFrames() {
  if (frame_reduced.value) reduced_height.value = frame_reduced.value.clientHeight
  if (!frame_full.value) return
  full_height.value = frame_full.value.clientHeight
  measure_width.value = frame_full.value.clientWidth
}

function measureBands() {
  const host = band_measure.value
  if (!host) return
  const next = new Map<number, number>()
  for (const el of host.querySelectorAll<HTMLElement>('[data-band-index]')) {
    next.set(Number(el.dataset.bandIndex), el.offsetHeight)
  }
  band_heights.value = next
  band_version.value++
}

function bandHeightOf(paragraph_index: number): number {
  return band_heights.value.get(paragraph_index) ?? 0
}

function recenter() {
  if (track.value) setPageTrack(track.value, -viewport_w.value)
}

function matchRangeAt(index: number): WordRange | null {
  const match = matches.value.get(index)
  return match ? { lo: match.lo, hi: match.hi } : null
}

function spreadOfWord(word_index: number): number {
  if (word_index < 0) return current_index.value
  return Math.floor(pageIndexOfWord(word_index) / pages_per_spread.value)
}

function pagesForSpread(index: number) {
  if (index < 0 || index >= spread_count.value) return []
  if (!two_page.value) return [{ slice: pages.value[index] ?? [], primary: true }]
  return [
    { slice: pages.value[index * 2] ?? [], primary: true },
    { slice: pages.value[index * 2 + 1] ?? [], primary: false }
  ]
}

async function slideTo(target: number) {
  const clamped = Math.min(Math.max(target, 0), spread_count.value - 1)
  if (!track.value) return

  if (clamped === current_index.value) {
    settlePageTrack(track.value, -viewport_w.value)
    return
  }

  const adjacent = Math.abs(clamped - current_index.value) === 1
  if (adjacent) {
    const to = clamped > current_index.value ? -viewport_w.value * 2 : 0
    await settlePageTrack(track.value, to)
  }

  current_index.value = clamped
  await nextTick()
  recenter()
  selectionApi.paintActiveWord()
}

function onControl(target: EventTarget | null): boolean {
  return !!(target as HTMLElement | null)?.closest('[data-no-swipe]')
}

function onPointerDown(event: PointerEvent) {
  if (onControl(event.target)) return

  start_x = event.clientX
  start_y = event.clientY
  pointer_down = true
  pointer_id = event.pointerId
  captured = false
  dragging = false
  decided = null
}

function onPointerMove(event: PointerEvent) {
  if (!pointer_down || event.pointerId !== pointer_id) return

  const dx = event.clientX - start_x
  const dy = event.clientY - start_y

  if (decided === null) {
    if (Math.abs(dx) > DECIDE_SLOP && Math.abs(dx) >= Math.abs(dy)) decided = 'swipe'
    else if (Math.abs(dy) > DECIDE_SLOP) decided = 'scroll'
  }

  if (decided !== 'swipe' || !track.value) return

  if (!captured) {
    viewport.value?.setPointerCapture?.(event.pointerId)
    captured = true
  }

  dragging = true
  const resisted = resistEdge(dx)
  setPageTrack(track.value, -viewport_w.value + resisted)
}

function resistEdge(dx: number): number {
  const at_start = current_index.value === 0 && dx > 0
  const at_end = current_index.value === spread_count.value - 1 && dx < 0
  return at_start || at_end ? dx * 0.35 : dx
}

function onPointerUp(event: PointerEvent) {
  if (!pointer_down || event.pointerId !== pointer_id) return

  const dx = event.clientX - start_x
  const dy = event.clientY - start_y

  if (!dragging) {
    if (Math.hypot(dx, dy) < TAP_SLOP) selectionApi.selectAtPoint(event.clientX, event.clientY)
    reset()
    return
  }

  const threshold = viewport_w.value * TURN_RATIO
  if (dx <= -threshold && current_index.value < spread_count.value - 1)
    turnPage(current_index.value + 1)
  else if (dx >= threshold && current_index.value > 0) turnPage(current_index.value - 1)
  else if (track.value) settlePageTrack(track.value, -viewport_w.value)

  reset()
}

function turnPage(target: number) {
  turning = true
  seekToSpread(target)
  slideTo(target).then(() => (turning = false))
}

function seekToSpread(spread: number) {
  const page_index = two_page.value ? spread * 2 : spread
  const first = pages.value[page_index]?.[0]?.words[0]?.index
  if (first !== undefined) seekToWord(first)
}

function onPointerCancel(event: PointerEvent) {
  if (event.pointerId !== pointer_id) return
  if (dragging && track.value) settlePageTrack(track.value, -viewport_w.value)
  reset()
}

function reset() {
  pointer_down = false
  pointer_id = -1
  captured = false
  dragging = false
  decided = null
}

function resumeFollow() {
  following.value = true
  slideTo(spreadOfWord(active_word.value))
}

function onSelectPlayFromHere() {
  playFromHere()
}

watch(spread_count, (count) => {
  if (current_index.value > count - 1) current_index.value = count - 1
  nextTick(recenter)
})

watch(
  () => paragraphs.value,
  () => nextTick(measureBands),
  { flush: 'post' }
)

watch(
  () => [current_footprint.value, split_mode.value] as const,
  () => {
    const el = band_el.value
    if (!el || !split_mode.value) {
      band_primed = false
      return
    }
    if (!band_primed) {
      setBand(el, current_footprint.value)
      band_primed = true
      return
    }
    resizeBand(el, current_footprint.value)
  },
  { flush: 'post' }
)

watch(
  () => active_word.value,
  () => {
    if (active_word.value < 0 || turning) return
    const target = spreadOfWord(active_word.value)

    if (!following.value) {
      if (target === current_index.value) following.value = true
      return
    }

    if (target !== current_index.value) slideTo(target)
  },
  { flush: 'post' }
)
</script>

<template>
  <div
    data-testid="paged-reader"
    class="relative flex h-[calc(100dvh-var(--nav-height))] w-full flex-col overflow-hidden px-(--page-px) pb-4"
    style="--paged-controls-h: 3.5rem; --paged-feather: 3.5rem"
  >
    <div
      ref="viewport"
      data-testid="paged-reader__viewport"
      class="relative min-h-0 flex-1 touch-none overflow-hidden"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <div
        aria-hidden="true"
        data-testid="paged-reader__frame-reduced"
        class="pointer-events-none invisible absolute inset-y-0 left-0 flex flex-col"
        :class="frame_reduced_class"
        :style="{ width: `${page_width}px` }"
      >
        <div ref="frame_reduced" class="min-h-0 flex-1"></div>
      </div>

      <div
        aria-hidden="true"
        data-testid="paged-reader__frame-full"
        class="pointer-events-none invisible absolute inset-y-0 left-0 flex flex-col"
        :class="frame_full_class"
        :style="{ width: `${page_width}px` }"
      >
        <div ref="frame_full" class="min-h-0 flex-1"></div>
      </div>

      <div
        ref="band_measure"
        aria-hidden="true"
        data-testid="paged-reader__band-measure"
        class="pointer-events-none invisible absolute inset-x-0 top-0 -z-10"
        :class="primary_x"
        :style="{ width: `${page_width}px` }"
      >
        <template v-for="paragraph in paragraphs" :key="paragraph.index">
          <div
            v-if="paragraph.translation"
            :data-band-index="paragraph.index"
            class="border-t border-line pt-3 text-lg text-ink-muted leading-[1.5]"
          >
            {{ paragraph.translation }}
          </div>
        </template>
      </div>

      <div
        ref="measure"
        aria-hidden="true"
        data-testid="paged-reader__measure-layer"
        class="invisible fixed top-0 left-0 -z-10 select-none text-4xl leading-[2.5] text-ink"
        :style="{ width: `${measure_width}px` }"
      >
        <paged-segment
          v-for="paragraph in paragraphs"
          :key="paragraph.index"
          class="mt-6 first:mt-0"
          :words="paragraph.words"
          :paragraph-index="paragraph.index"
          :translation="paragraph.translation"
          :show-gloss="gloss_mode"
          ends-paragraph
        />
      </div>

      <div ref="track" data-testid="paged-reader__track" class="absolute inset-y-0 left-0 flex">
        <div
          v-for="spread in slots"
          :key="spread"
          data-testid="paged-reader__slot"
          class="flex h-full shrink-0"
          :style="{ width: `${viewport_w}px`, gap: `${SPREAD_GAP}px` }"
        >
          <paged-page
            v-for="(unit, i) in pagesForSpread(spread)"
            :key="i"
            :class="unit.primary ? primary_page_class : right_page_class"
            :style="{ width: `${page_width}px` }"
            :slices="unit.slice"
          />
        </div>
      </div>

      <div
        data-no-swipe
        data-testid="paged-reader__dock"
        class="absolute bottom-0 left-0 z-20 flex flex-col"
        :class="primary_x"
        :style="{ width: `${page_width}px` }"
      >
        <div
          aria-hidden="true"
          class="paged-dock-surface absolute bottom-0 left-0 -z-10 bg-surface"
          :style="{
            top: 'calc(var(--paged-feather) * -1)',
            right: 'calc(var(--paged-feather) * -1)'
          }"
        />

        <div
          v-if="split_mode"
          ref="band_el"
          data-testid="paged-reader__split"
          class="overflow-hidden border-t border-line pt-3"
        >
          <div class="h-full overflow-y-auto">
            <div
              class="flex min-h-full flex-col text-lg text-ink-muted leading-[1.5]"
              :class="active_overflows ? 'justify-start' : 'justify-center'"
            >
              {{ active_translation }}
            </div>
          </div>
        </div>

        <div data-testid="paged-reader__controls" class="flex h-(--paged-controls-h) items-center">
          <paged-controls :player="player" @open-settings="settings_open = true" />
        </div>
      </div>
    </div>

    <transition :css="false" @enter="fadeEnter" @leave="fadeLeave">
      <div
        v-if="!following"
        data-testid="paged-reader__resume"
        class="absolute right-6 bottom-24 z-30"
      >
        <resume-follow-button :direction="resume_direction" @resume="resumeFollow" />
      </div>
    </transition>

    <paged-term-sheet
      :selection="selection"
      :open="popover_open"
      :target-lang="target_lang"
      :existing-decks="selected_term_decks"
      @close="closeTerm"
      @play-from-here="onSelectPlayFromHere"
      @play-word="playClip"
    />

    <transition :css="false" @enter="fadeEnter" @leave="fadeLeave">
      <div
        v-if="settings_open"
        data-testid="paged-reader__settings"
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
  </div>
</template>

<style scoped>
.paged-dock-surface {
  -webkit-mask-image:
    linear-gradient(to bottom, transparent, #000 var(--paged-feather)),
    linear-gradient(to left, transparent, #000 var(--paged-feather));
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(to bottom, transparent, #000 var(--paged-feather)),
    linear-gradient(to left, transparent, #000 var(--paged-feather));
  mask-composite: intersect;
}
</style>
