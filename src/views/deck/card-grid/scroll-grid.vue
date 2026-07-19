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
// container_width starts at 0, so columns/row_count fall back to a single tall
// column for one frame — gate the rendered height on this so that never paints.
const measured = ref(false)

const { cell_width, gap, columns, row_count, row_pitch, itemPosition } = useCardGrid(
  grid_size,
  container_width,
  () => displayed_cards.value.length
)

// Reordering shares the editor list's engine — same sounds, same gap-shift feel.
// Only the geometry differs: a card's ideal slot is read in 2-D (column + row),
// and a gap-shift is the px gap to the neighbouring cell, so a card wrapping a
// row edge animates to the next row for free.
const reorder = useReorderDrag({
  count: () => displayed_cards.value.length,
  enabled: () => is_rearranging.value && !is_active.value,
  topInset: () => sticky_toolbar?.getBoundingClientRect().bottom ?? 0,
  // Clean, transform-immune scroll bound that grows as infinite-scroll loads
  // more rows mid-drag, so auto-scroll past the sentinel keeps going.
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
    // Keep the dragged card's row rendered even after auto-scroll carries it out
    // of the overscan window — otherwise the card unmounts mid-drag.
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

// Flatten the virtualizer's visible rows into individual positioned cards, so
// each card is laid out (and dragged) on its own. The per-card transform is the
// seam the reorder engine's live offset is added on top of.
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
// The sticky toolbar (md+) covers the top of the grid; its viewport-space
// bottom is the inset where drag auto-scroll-up should start.
let sticky_toolbar: HTMLElement | null = null
// The card lifted on pickup, held so the matching drop can settle it back — the
// drop fires from a window pointerup, not a DOM event on the card.
let lifted_card: HTMLElement | null = null

// Measure the container, not the grid itself: during a mode-swap the grid pane
// is transformed (it scales + drops out of flow), which would corrupt its own
// rect. The parent stays in flow, so its width and document offset stay true.
function measureLayout() {
  const container = grid_el.value?.parentElement
  if (!container) return
  container_width.value = container.clientWidth
  scroll_margin.value = container.getBoundingClientRect().top + window.scrollY
  measured.value = true
  // scrollMargin flows into the virtualizer's options reactively, but its own
  // scroll-offset tracking doesn't otherwise know to resync against it — an
  // explicit measure() keeps the two from racing (see the resize debounce
  // below for why this can otherwise fire mid-scroll).
  virtualizer.value.measure()
}

// The dock publishing its live height resizes the page body (see
// mobile-dock-host.vue), which can itself be driven by --edge-safe-padding
// changing live while the visual viewport resizes during a scroll gesture on
// mobile Chrome. Observing document.body means that cascade fires this
// mid-scroll, computing `scroll_margin` from a `window.scrollY` snapshot
// that's still moving — debounce so a resize burst settles once the scroll
// (and the cascade it triggered) has actually stopped, instead of feeding the
// virtualizer a scroll_margin that's already stale by the time it's set.
const RESIZE_DEBOUNCE_MS = 120
let resize_timer: ReturnType<typeof setTimeout> | undefined
function onBodyResize() {
  clearTimeout(resize_timer)
  resize_timer = setTimeout(measureLayout, RESIZE_DEBOUNCE_MS)
}

// The drag/gap-shift offset (px) the reorder engine wants applied to the card at
// `index`, on top of its resting slot position. Empty until a drag is live.
function dragTransform(index: number) {
  const offset = reorder.dragOffset(index)
  return `translate(${offset.x}px, ${offset.y}px)`
}

// Idle iOS-style jiggle: vary phase and tempo per card off its index so the grid
// shimmers organically instead of beating in unison.
function jiggleStyle(index: number) {
  return {
    '--jiggle-delay': `${-(index % 11) * 47}ms`,
    '--jiggle-duration': `${240 + (index % 5) * 16}ms`
  }
}

// Begin a drag and, once it actually starts (gated to rearrange mode), lift the
// grabbed card. The element is held so the matching drop can settle it back.
function beginDrag(index: number, event: PointerEvent) {
  reorder.start(index, event)
  if (reorder.dragging_index.value === null) return

  lifted_card = (event.target as HTMLElement).closest<HTMLElement>('[data-testid="grid-item"]')
  if (lifted_card) liftListItem(lifted_card)
}

// Mouse picks up immediately; touch waits out a press-and-hold so a plain swipe
// still scrolls the grid. The hold aborts the moment the finger drifts. Outside
// rearrange mode each grid item owns its own long-press (see grid-item.vue).
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
      class="py-12 text-center text-base text-brown-600 dark:text-brown-200"
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
      class="w-full py-6 flex items-center justify-center text-brown-500"
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
