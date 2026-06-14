<script setup lang="ts">
import GridItem from './grid-item.vue'
import { useCardGrid } from './use-card-grid'
import { cardEditorKey } from '@/composables/card/list-controller'
import { deckViewShellKey } from '@/composables/deck/view-shell'
import { inject, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { list, selection, card_attributes, hasNextPage, isLoading, observeSentinel } =
  inject(cardEditorKey)!
const { grid_size } = inject(deckViewShellKey)!
const { all_cards } = list
const { isCardSelected } = selection

const side = ref<'front' | 'back'>('front')
const sentinel = useTemplateRef<HTMLElement>('sentinel')

const { card_scale, grid_style } = useCardGrid(grid_size)

observeSentinel(sentinel)
</script>

<template>
  <div data-testid="card-grid-container" class="w-full h-full md:min-h-0 overflow-y-auto py-2">
    <div data-testid="card-grid" class="grid justify-center gap-4" :style="grid_style">
      <grid-item
        v-for="card in all_cards"
        :key="card.client_id"
        :card="card"
        :side="side"
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
