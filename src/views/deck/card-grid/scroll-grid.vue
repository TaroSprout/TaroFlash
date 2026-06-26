<script setup lang="ts">
import GridItem from './grid-item.vue'
import { useCardGrid } from './use-card-grid'
import { cardEditorKey, cardSearchKey } from '@/views/deck/composables'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'
import { inject, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { selection, card_attributes, hasNextPage, isLoading, observeSentinel } =
  inject(cardEditorKey)!
const { grid_size } = inject(deckViewShellKey)!
const { is_active, displayed_cards, no_results } = inject(cardSearchKey)!
const { isCardSelected } = selection

const side = ref<'front' | 'back'>('front')
const sentinel = useTemplateRef<HTMLElement>('sentinel')

const { card_scale, grid_style, grid_classes } = useCardGrid(grid_size)

observeSentinel(sentinel)
</script>

<template>
  <div data-testid="card-grid-container" class="w-full h-full md:min-h-0 overflow-y-auto py-2">
    <p
      v-if="no_results"
      data-testid="card-grid__no-results"
      class="py-12 text-center text-base text-brown-600 dark:text-brown-200"
    >
      {{ t('deck-view.search-bar.no-results') }}
    </p>

    <div v-else data-testid="card-grid" :class="grid_classes" :style="grid_style">
      <grid-item
        v-for="card in displayed_cards"
        :key="card.client_id"
        :card="card"
        :side="side"
        :scale="card_scale"
        :card_attributes="card_attributes"
        :selected="card.id !== undefined ? isCardSelected(card.id) : false"
      ></grid-item>
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
