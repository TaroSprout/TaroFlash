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
import { useWindowVirtualizer } from '@tanstack/vue-virtual'

type VisibleItem = { index: number; card: CardWithClientId; x: number; y: number }

const OVERSCAN = 2

const { t } = useI18n()

const { selection, card_attributes, hasNextPage, isLoading, observeSentinel } =
  inject(cardEditorKey)!
const { grid_size, is_view } = inject(deckViewShellKey)!
const { is_active, displayed_cards, no_results } = inject(cardSearchKey)!
const { isCardSelected } = selection

const side = ref<'front' | 'back'>('front')
const grid_el = useTemplateRef<HTMLElement>('grid_el')
const sentinel = useTemplateRef<HTMLElement>('sentinel')
const container_width = ref(0)
const scroll_margin = ref(0)

const { card_scale, cell_width, columns, row_count, row_pitch, itemPosition } = useCardGrid(
  grid_size,
  container_width,
  () => displayed_cards.value.length
)

const virtualizer = useWindowVirtualizer(
  computed(() => ({
    count: row_count.value,
    estimateSize: () => row_pitch.value,
    overscan: OVERSCAN,
    scrollMargin: scroll_margin.value
  }))
)

// Flatten the virtualizer's visible rows into individual positioned cards, so
// each card is laid out (and later dragged) on its own. The per-card transform
// is the seam a drag-to-reorder layer adds its live offset on top of.
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

// Measure the container, not the grid itself: during a mode-swap the grid pane
// is transformed (it scales + drops out of flow), which would corrupt its own
// rect. The parent stays in flow, so its width and document offset stay true.
function measureLayout() {
  const container = grid_el.value?.parentElement
  if (!container) return
  container_width.value = container.clientWidth
  scroll_margin.value = container.getBoundingClientRect().top + window.scrollY
}

onMounted(() => {
  measureLayout()
  resize_observer = new ResizeObserver(measureLayout)
  resize_observer.observe(document.body)
})

onBeforeUnmount(() => resize_observer?.disconnect())

observeSentinel(sentinel)

// The grid is kept mounted via v-show, so its offset is stale when it un-hides
// on leaving edit mode — remeasure once it's back in flow.
watch(is_view, (showing) => {
  if (showing) nextTick(measureLayout)
})

// Column count and row pitch shift with viewport width and the size toggle;
// remeasure so total size and row offsets stay exact.
watch([columns, row_pitch], () => virtualizer.value.measure())
</script>

<template>
  <div ref="grid_el" data-testid="card-grid-container" class="w-full py-2">
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
      :style="{ height: `${virtualizer.getTotalSize()}px` }"
    >
      <div
        v-for="item in visible_items"
        :key="item.card.client_id"
        data-testid="card-grid__item"
        class="absolute top-0 left-0"
        :style="{ width: `${cell_width}px`, transform: `translate(${item.x}px, ${item.y}px)` }"
      >
        <grid-item
          :card="item.card"
          :side="side"
          :scale="card_scale"
          :card_attributes="card_attributes"
          :selected="item.card.id !== undefined ? isCardSelected(item.card.id) : false"
        />
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
