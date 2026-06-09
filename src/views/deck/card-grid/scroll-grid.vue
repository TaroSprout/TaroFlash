<script setup lang="ts">
import GridItem from './grid-item.vue'
import {
  type CardGridSize,
  type CardListController
} from '@/composables/card-editor/card-list-controller'
import { computed, inject, ref, useTemplateRef, type CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { list, selection, card_attributes, hasNextPage, isLoading, observeSentinel, grid_size } =
  inject<CardListController>('card-editor')!
const { all_cards } = list
const { isCardSelected } = selection

// Cards always render at xl and scale uniformly, so one factor drives both the
// rendered card and its grid column — no per-size visual tuning to keep in sync.
const XL_CARD_WIDTH = 314
const CARD_SCALE: Record<CardGridSize, number> = {
  base: 0.6,
  md: 0.75,
  xl: 1
}

const side = ref<'front' | 'back'>('front')
const sentinel = useTemplateRef<HTMLElement>('sentinel')

const card_scale = computed(() => CARD_SCALE[grid_size.value])

const grid_style = computed<CSSProperties>(() => ({
  gridTemplateColumns: `repeat(auto-fill, ${XL_CARD_WIDTH * card_scale.value}px)`
}))

observeSentinel(sentinel)
</script>

<template>
  <div data-testid="card-grid-container" class="w-full h-full md:min-h-0 overflow-y-auto">
    <div data-testid="card-grid" class="grid justify-center gap-4" :style="grid_style">
      <grid-item
        v-for="card in all_cards"
        :key="card.client_id"
        :card="card"
        :side="side"
        :fill="false"
        :scale="card_scale"
        :card_attributes="card_attributes"
        :selected="card.id !== undefined ? isCardSelected(card.id) : false"
      ></grid-item>
    </div>

    <div
      v-if="hasNextPage"
      ref="sentinel"
      data-testid="card-grid__sentinel"
      class="w-full py-6 flex items-center justify-center text-brown-500"
    >
      <span v-if="isLoading">{{ t('deck-view.card-grid.loading') }}</span>
    </div>
  </div>
</template>
