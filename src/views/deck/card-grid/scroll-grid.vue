<script setup lang="ts">
import GridItem from './grid-item.vue'
import { useCardGrid } from './use-card-grid'
import { cardEditorKey, cardSearchKey, type CardWithClientId } from '@/views/deck/composables'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
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
import { useI18n } from 'vue-i18n'
import { useWindowVirtualizer, defaultRangeExtractor } from '@tanstack/vue-virtual'
import { useReorderDrag } from '@/composables/use-reorder-drag'
import { usePressHold } from '@/composables/ui/press-hold'
import { liftListItem, dropListItem } from '@/utils/animations/list-item'

type VisibleItem = { index: number; card: CardWithClientId; x: number; y: number }

const OVERSCAN = 2
// Touch picks a card up on a press-and-hold (like iOS), so a plain swipe still
// scrolls the page; a small finger move within the window aborts the hold.
const HOLD_MS = 200
const HOLD_TOLERANCE = 8

const { t } = useI18n()

const { selection, card_attributes, reorderCard, hasNextPage, isLoading, observeSentinel } =
  inject(cardEditorKey)!
const { grid_size, grid_face, is_view, is_rearranging } = inject(deckViewShellKey)!
const { is_active, displayed_cards, no_results } = inject(cardSearchKey)!
const { isCardSelected } = selection

const reorder_hold = usePressHold({ duration: HOLD_MS, tolerance: HOLD_TOLERANCE })

const grid_el = useTemplateRef<HTMLElement>('grid_el')
const sentinel = useTemplateRef<HTMLElement>('sentinel')
const container_width = ref(0)
const scroll_margin = ref(0)
// Gates the rendered height so the single-tall-column fallback frame never paints.
const measured = ref(false)

const { cell_width, gap, columns, row_count, row_pitch, itemPosition } = useCardGrid(
  grid_size,
  container_width,
  () => displayed_cards.value.length
)

// Shares the editor list's reorder engine; only the geometry differs — a
// card's ideal slot is read in 2-D (column + row).
const reorder = useReorderDrag({
  count: () => displayed_cards.value.length,
  enabled: () => is_rearranging.value && !is_active.value,
  topInset: () => sticky_toolbar?.getBoundingClientRect().bottom ?? 0,
  // Grows as infinite-scroll loads more rows mid-drag, so auto-scroll past the sentinel keeps going.
  maxScroll: () => scroll_margin.value + virtualizer.value.getTotalSize() - window.innerHeight,
  onReorder: reorderCard,
  geometry: {
    idealIndex: (from, dx, dy) => {
      const cols = columns.value
      const col = (from % cols) + dx / (cell_width.value + gap.value)
      const row = Math.floor(from / cols) + dy / row_pitch.value
      return row * cols + Math.min(cols - 1, Math.max(0, col))
    },
    position: itemPosition
  }
})

const virtualizer = useWindowVirtualizer(
  computed(() => ({
    count: row_count.value,
    estimateSize: () => row_pitch.value,
    overscan: OVERSCAN,
    scrollMargin: scroll_margin.value,
    // Keeps the dragged card's row rendered past the overscan window so it doesn't unmount mid-drag.
    rangeExtractor: (range) => {
      const rows = defaultRangeExtractor(range)
      const dragging = reorder.dragging_index.value
      if (dragging === null) return rows

      const row = Math.floor(dragging / columns.value)
      if (rows.includes(row)) return rows
      return [...rows, row].sort((a, b) => a - b)
    }
  }))
)

// Flattens the virtualizer's visible rows into individually positioned cards,
// so each one's transform is the seam the reorder engine's live offset adds to.
const visible_items = computed(() => {
  const cols = columns.value
  const total = displayed_cards.value.length
  const items: VisibleItem[] = []

  for (const vrow of virtualizer.value.getVirtualItems()) {
    const start = vrow.index * cols
    for (let i = start; i < start + cols && i < total; i++) {
      const { x, y } = itemPosition(i)
      items.push({ index: i, card: displayed_cards.value[i], x, y })
    }
  }

  return items
})

let resize_observer: ResizeObserver | undefined
// Viewport-space bottom of the sticky toolbar (md+) — the inset drag auto-scroll-up starts from.
let sticky_toolbar: HTMLElement | null = null
// Held so the matching drop, which fires from a window pointerup rather than
// a DOM event on the card, can settle it back.
let lifted_card: HTMLElement | null = null

// Measures the parent, not the grid pane itself — the pane is transformed
// during a mode-swap, which would corrupt its own rect.
function measureLayout() {
  const container = grid_el.value?.parentElement
  if (!container) return
  container_width.value = container.clientWidth
  scroll_margin.value = container.getBoundingClientRect().top + window.scrollY
  measured.value = true
  // Explicit measure() keeps the virtualizer's own scroll-offset tracking from racing scrollMargin.
  virtualizer.value.measure()
}

// Debounced so a resize burst (the mobile dock's live height, cascading from
// --edge-safe-padding) settles after scroll stops, instead of measuring
// scroll_margin from a window.scrollY snapshot that's still moving.
const RESIZE_DEBOUNCE_MS = 120
let resize_timer: ReturnType<typeof setTimeout> | undefined
function onBodyResize() {
  clearTimeout(resize_timer)
  resize_timer = setTimeout(measureLayout, RESIZE_DEBOUNCE_MS)
}

/** The reorder engine's live gap-shift offset (px) for the card at `index`, on top of its resting slot. */
function dragTransform(index: number) {
  const offset = reorder.dragOffset(index)
  return `translate(${offset.x}px, ${offset.y}px)`
}

// Varies phase and tempo per card off its index so the idle jiggle shimmers organically, not in unison.
function jiggleStyle(index: number) {
  return {
    '--jiggle-delay': `${-(index % 11) * 47}ms`,
    '--jiggle-duration': `${240 + (index % 5) * 16}ms`
  }
}

function beginDrag(index: number, event: PointerEvent) {
  reorder.start(index, event)
  if (reorder.dragging_index.value === null) return

  lifted_card = (event.target as HTMLElement).closest<HTMLElement>('[data-testid="grid-item"]')
  if (lifted_card) liftListItem(lifted_card)
}

// Touch waits out a press-and-hold so a plain swipe still scrolls the grid; mouse picks up immediately.
function onItemPointerdown(index: number, event: PointerEvent) {
  if (!is_rearranging.value || is_active.value) return

  if (event.pointerType === 'mouse') beginDrag(index, event)
  else reorder_hold.arm(event, () => beginDrag(index, event))
}

onMounted(() => {
  measureLayout()
  sticky_toolbar = document.querySelector('[data-testid="deck-view__toolbar"]')
  resize_observer = new ResizeObserver(onBodyResize)
  resize_observer.observe(document.body)
})

onBeforeUnmount(() => {
  clearTimeout(resize_timer)
  resize_observer?.disconnect()
  reorder_hold.cancel()
})

observeSentinel(sentinel)

// The grid is kept mounted via v-show, so its offset is stale when it un-hides
// on leaving edit mode — remeasure once it's back in flow.
watch(is_view, (showing) => {
  if (showing) nextTick(measureLayout)
})

// Column count and row pitch shift with viewport width and the size toggle;
// remeasure so total size and row offsets stay exact.
watch([columns, row_pitch], () => virtualizer.value.measure())

// Settle the lifted card back to rest the moment the drag ends (engine clears
// dragging_index on the window pointerup).
watch(
  () => reorder.dragging_index.value,
  (current, previous) => {
    if (current !== null || previous === null || !lifted_card) return
    dropListItem(lifted_card)
    lifted_card = null
  }
)
</script>

<template>
  <div
    ref="grid_el"
    data-testid="card-grid-container"
    class="press-hold-guard w-full py-2"
    :class="{ 'rearrange-no-select': is_rearranging }"
  >
    <p
      v-if="no_results"
      data-testid="card-grid__no-results"
      class="py-12 text-center text-base text-ink"
    >
      {{ t('deck-view.search-bar.no-results') }}
    </p>

    <div
      v-else
      data-testid="card-grid"
      class="relative w-full"
      :style="{ height: measured ? `${virtualizer.getTotalSize()}px` : '0px' }"
    >
      <div
        v-for="item in visible_items"
        :key="item.card.client_id"
        data-testid="card-grid__item"
        class="absolute top-0 left-0"
        :class="{
          'z-30': item.index === reorder.dragging_index.value,
          'cursor-grabbing': item.index === reorder.dragging_index.value,
          'cursor-grab': is_rearranging && item.index !== reorder.dragging_index.value
        }"
        :style="{ width: `${cell_width}px`, transform: `translate(${item.x}px, ${item.y}px)` }"
        @pointerdown="onItemPointerdown(item.index, $event)"
      >
        <div
          data-testid="card-grid__item-inner"
          class="will-change-transform"
          :class="{
            'transition-transform duration-150 ease-out': reorder.shouldTransition(item.index)
          }"
          :style="{ transform: dragTransform(item.index) }"
        >
          <grid-item
            :card="item.card"
            :side="grid_face"
            :card_attributes="card_attributes"
            :rearranging="is_rearranging"
            :dragging="item.index === reorder.dragging_index.value"
            :style="jiggleStyle(item.index)"
            :selected="item.card.id !== undefined ? isCardSelected(item.card.id) : false"
          />
        </div>
      </div>
    </div>

    <div
      v-if="hasNextPage && !is_active"
      ref="sentinel"
      data-testid="card-grid__sentinel"
      class="w-full py-6 flex items-center justify-center text-ink-muted"
    >
      <span v-if="isLoading">{{ t('deck-view.card-grid.loading') }}</span>
    </div>
  </div>
</template>

<style scoped>
/* A press-and-hold must never race the iOS text-selection / callout gesture.
   Suppress the callout everywhere, and selection on touch pointers the whole
   time — desktop keeps click-drag text selection of card content. Both inherit,
   so setting them on the container covers every card inside. */
.press-hold-guard {
  -webkit-touch-callout: none;
}

@media (pointer: coarse) {
  .press-hold-guard {
    -webkit-user-select: none;
    user-select: none;
  }
}

/* Rearrange also suppresses selection for mouse drags (desktop pickup). */
.rearrange-no-select {
  -webkit-user-select: none;
  user-select: none;
}
</style>
