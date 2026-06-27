<script setup lang="ts">
import GridItem from './grid-item.vue'
import { useCardGrid } from './use-card-grid'
import { cardEditorKey, cardSearchKey, type CardWithClientId } from '@/views/deck/composables'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { computed, inject, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVirtualizer } from '@tanstack/vue-virtual'

type VisibleItem = { index: number; card: CardWithClientId; x: number; y: number }

const OVERSCAN = 2

const { t } = useI18n()

const { selection, card_attributes, hasNextPage, isLoading, observeSentinel } =
  inject(cardEditorKey)!
const { grid_size } = inject(deckViewShellKey)!
const { is_active, displayed_cards, no_results } = inject(cardSearchKey)!
const { isCardSelected } = selection

const side = ref<'front' | 'back'>('front')
const scroll_el = useTemplateRef<HTMLElement>('scroll_el')
const sentinel = useTemplateRef<HTMLElement>('sentinel')
const container_width = ref(0)

const { card_scale, cell_width, columns, row_count, row_pitch, itemPosition } = useCardGrid(
  grid_size,
  container_width,
  () => displayed_cards.value.length
)

const virtualizer = useVirtualizer(
  computed(() => ({
    count: row_count.value,
    getScrollElement: () => scroll_el.value,
    estimateSize: () => row_pitch.value,
    overscan: OVERSCAN
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

function measureWidth() {
  container_width.value = scroll_el.value?.clientWidth ?? 0
}

onMounted(() => {
  measureWidth()
  resize_observer = new ResizeObserver(measureWidth)
  if (scroll_el.value) resize_observer.observe(scroll_el.value)
})

onBeforeUnmount(() => resize_observer?.disconnect())

observeSentinel(sentinel)

// Column count and row pitch shift with viewport width and the size toggle;
// remeasure so total size and row offsets stay exact.
watch([columns, row_pitch], () => virtualizer.value.measure())
</script>

<template>
  <div
    ref="scroll_el"
    data-testid="card-grid-container"
    class="w-full h-full md:min-h-0 overflow-y-auto py-2"
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
