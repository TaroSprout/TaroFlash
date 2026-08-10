<script setup lang="ts">
import Card from '@/components/card/index.vue'
import { useParentScrollMargin } from '@/composables/ui/parent-scroll-margin'
import { computed, inject, useTemplateRef } from 'vue'
import { useWindowVirtualizer } from '@tanstack/vue-virtual'
import { CARD_LIST_ROW_PITCH } from '@/views/deck/card-editor/row-pitch'
import { cardEditorKey } from '@/views/deck/composables'
import { cardImportKey } from '@/views/deck/composables/card-import'

const OVERSCAN = 3

const { card_attributes } = inject(cardEditorKey)!
const { cards } = inject(cardImportKey)!

const list_el = useTemplateRef<HTMLElement>('list_el')

const { scroll_margin } = useParentScrollMargin(list_el, {
  onMeasure: () => virtualizer.value.measure()
})

const virtualizer = useWindowVirtualizer(
  computed(() => ({
    count: cards.value.length,
    estimateSize: () => CARD_LIST_ROW_PITCH,
    overscan: OVERSCAN,
    scrollMargin: scroll_margin.value
  }))
)
</script>

<template>
  <div ref="list_el" data-testid="card-import-preview-list" class="w-full py-2">
    <div
      data-testid="card-import-preview-list__viewport"
      class="relative w-full"
      :style="{ height: `${virtualizer.getTotalSize()}px` }"
    >
      <div
        v-for="row in virtualizer.getVirtualItems()"
        :key="row.key as number"
        data-testid="card-import-preview-list__row"
        class="absolute top-0 left-0 flex w-full items-center justify-center gap-6"
        :style="{
          height: `${row.size}px`,
          transform: `translateY(${row.start - scroll_margin}px)`
        }"
      >
        <card
          :front_text="cards[row.index].front_text"
          :back_text="cards[row.index].back_text"
          side="front"
          :card_attributes="card_attributes"
          class="w-(--card-w-full)"
        />
        <card
          :front_text="cards[row.index].front_text"
          :back_text="cards[row.index].back_text"
          side="back"
          :card_attributes="card_attributes"
          class="w-(--card-w-full)"
        />
      </div>
    </div>
  </div>
</template>
