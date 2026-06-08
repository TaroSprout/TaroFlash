<script setup lang="ts">
import GridItem from './grid-item.vue'
import { type CardListController } from '@/composables/card-editor/card-list-controller'
import { inject, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { list, selection, card_attributes, hasNextPage, isLoading, observeSentinel } =
  inject<CardListController>('card-editor')!
const { all_cards } = list
const { isCardSelected } = selection

const side = ref<'front' | 'back'>('front')
const sentinel = useTemplateRef<HTMLElement>('sentinel')

observeSentinel(sentinel)
</script>

<template>
  <div data-testid="card-grid-container" class="w-full h-full md:min-h-0 overflow-y-auto">
    <div
      data-testid="card-grid"
      class="grid grid-cols-[repeat(auto-fill,192px)] justify-center gap-4"
    >
      <grid-item
        v-for="card in all_cards"
        :key="card.client_id"
        :card="card"
        :side="side"
        :fill="false"
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
