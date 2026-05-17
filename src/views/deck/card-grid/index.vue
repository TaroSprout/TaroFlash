<script setup lang="ts">
import GridItem from './grid-item.vue'
import { type CardListController } from '@/composables/card-editor/card-list-controller'
import { computed, inject, ref, useTemplateRef, watch, type CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGridCapacity } from '@/composables/use-grid-capacity'
import { useMediaQuery } from '@/composables/use-media-query'
import { slideInFromDirection, slideOutInDirection } from '@/utils/animations/grid-page'

const { t } = useI18n()

const { list, selection, carousel, card_attributes, hasNextPage, isLoading, observeSentinel } =
  inject<CardListController>('card-editor')!
const { all_cards } = list
const { is_selecting, isCardSelected } = selection
const { visible_cards, setVisibleCapacity, page, page_size, page_direction, is_page_loading } =
  carousel

const side = ref<'front' | 'back'>('front')
const grid_wrapper = useTemplateRef<HTMLElement>('grid_wrapper')
const sentinel = useTemplateRef<HTMLElement>('sentinel')

const isMd = useMediaQuery('md')

observeSentinel(sentinel)

const MIN_ITEM_WIDTH = 170
const MAX_ITEM_WIDTH = 220

const { gridStyle: desktopGridStyle, capacity } = useGridCapacity({
  bounds: grid_wrapper,
  aspect_ratio: 7 / 8,
  min_width: MIN_ITEM_WIDTH,
  max_width: MAX_ITEM_WIDTH,
  gap: () => (isMd.value ? 12 : 8)
})

const mobileGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${MIN_ITEM_WIDTH}px, 1fr))`,
  gap: '8px',
  justifyContent: 'center'
}

const gridStyle = computed(() => (isMd.value ? desktopGridStyle.value : mobileGridStyle))

// only push capacity into the controller while the carousel is active —
// below md the grid scrolls natively and paging state is irrelevant
watch(
  capacity,
  (n) => {
    if (isMd.value) setVisibleCapacity(n)
  },
  { immediate: true }
)

// md+ renders the current page; below md renders everything and lets the
// page scroll naturally with infinite-scroll loading more
const cards_to_render = computed(() => (isMd.value ? visible_cards.value : all_cards.value))
</script>

<template>
  <div
    data-testid="card-grid-container"
    class="flex flex-col items-center w-full h-full md:flex-1 md:min-h-0"
  >
    <div
      ref="grid_wrapper"
      data-testid="card-grid__wrapper"
      class="w-full h-full md:flex-1 md:min-h-0"
    >
      <Transition
        :css="false"
        mode="out-in"
        @enter="(el, done) => slideInFromDirection(el, page_direction, done)"
        @leave="(el, done) => slideOutInDirection(el, page_direction, done)"
      >
        <div
          :key="isMd ? page : 'all'"
          data-testid="card-grid"
          :style="gridStyle"
          class="justify-items-center w-full"
        >
          <template v-if="cards_to_render.length > 0 && !is_page_loading">
            <grid-item
              v-for="card in cards_to_render"
              :key="card.client_id"
              :card="card"
              :is_selecting="is_selecting"
              :side="side"
              :card_attributes="card_attributes"
              :selected="card.id !== undefined ? isCardSelected(card.id) : false"
            ></grid-item>
          </template>

          <template v-else>
            <div
              v-for="n in Math.max(capacity, page_size, 1)"
              :key="`skel-${n}`"
              data-testid="card-grid__skeleton"
              class="aspect-card w-full bg-brown-200 dark:bg-grey-800 rounded-xl animate-pulse"
            ></div>
          </template>
        </div>
      </Transition>
    </div>

    <div
      v-if="!isMd && hasNextPage"
      ref="sentinel"
      data-testid="card-grid__sentinel"
      class="w-full py-6 flex items-center justify-center text-brown-500"
    >
      <span v-if="isLoading">{{ t('deck-view.card-grid.loading') }}</span>
    </div>
  </div>
</template>
