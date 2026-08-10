<script setup lang="ts">
import Card from '@/components/card/index.vue'
import { useCardGrid } from '@/views/deck/card-grid/use-card-grid'
import { useParentScrollMargin } from '@/composables/ui/parent-scroll-margin'
import { computed, inject, useTemplateRef } from 'vue'
import { useWindowVirtualizer } from '@tanstack/vue-virtual'
import { cardEditorKey } from '@/views/deck/composables'
import { cardImportKey } from '@/views/deck/composables/card-import'
import { type CardGridSize } from '@/views/deck/composables/view-shell'

const OVERSCAN = 2
// The preview is a fixed size rather than the member's chosen one — they are
// reading these cards to check the import, not browsing a deck they know.
const PREVIEW_SIZE: CardGridSize = 'md'

const { card_attributes } = inject(cardEditorKey)!
const { cards } = inject(cardImportKey)!

const grid_el = useTemplateRef<HTMLElement>('grid_el')

const { scroll_margin, container_width, measured } = useParentScrollMargin(grid_el, {
  onMeasure: () => virtualizer.value.measure()
})

const { cell_width, columns, row_count, row_pitch, itemPosition } = useCardGrid(
  PREVIEW_SIZE,
  container_width,
  () => cards.value.length
)

const virtualizer = useWindowVirtualizer(
  computed(() => ({
    count: row_count.value,
    estimateSize: () => row_pitch.value,
    overscan: OVERSCAN,
    scrollMargin: scroll_margin.value
  }))
)

const visible_items = computed(() =>
  virtualizer.value.getVirtualItems().flatMap((row) => {
    const start = row.index * columns.value
    const end = Math.min(start + columns.value, cards.value.length)

    return Array.from({ length: Math.max(0, end - start) }, (_, offset) => {
      const index = start + offset
      return { index, card: cards.value[index], ...itemPosition(index) }
    })
  })
)
</script>

<template>
  <div ref="grid_el" data-testid="card-import-preview-grid" class="w-full py-2">
    <div
      data-testid="card-import-preview-grid__viewport"
      class="relative w-full"
      :style="{ height: measured ? `${virtualizer.getTotalSize()}px` : '0px' }"
    >
      <div
        v-for="item in visible_items"
        :key="item.index"
        data-testid="card-import-preview-grid__item"
        class="absolute top-0 left-0 aspect-card"
        :style="{ width: `${cell_width}px`, transform: `translate(${item.x}px, ${item.y}px)` }"
      >
        <card
          :front_text="item.card.front_text"
          :back_text="item.card.back_text"
          side="front"
          :card_attributes="card_attributes"
        />
      </div>
    </div>
  </div>
</template>
