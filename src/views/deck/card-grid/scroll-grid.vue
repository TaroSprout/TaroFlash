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

const COLUMN_WIDTH: Record<CardGridSize, string> = {
  base: '192px',
  md: '240px',
  xl: '314px'
}

const side = ref<'front' | 'back'>('front')
const sentinel = useTemplateRef<HTMLElement>('sentinel')

const grid_style = computed<CSSProperties>(() => ({
  gridTemplateColumns: `repeat(auto-fill, ${COLUMN_WIDTH[grid_size.value]})`
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
        :size="grid_size"
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
