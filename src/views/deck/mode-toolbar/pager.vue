<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import UiTag from '@/components/ui-kit/tag.vue'
import { useI18n } from 'vue-i18n'
import { inject } from 'vue'
import { type CardListController } from '@/composables/card-editor/card-list-controller'

const { t } = useI18n()

const { carousel } = inject<CardListController>('card-editor')!
const { page, total_pages, prev_page_number, next_page_number, prevPage, nextPage, can_paginate } =
  carousel
</script>

<template>
  <div class="hidden md:flex items-center gap-2" data-testid="pager">
    <ui-tag
      data-testid="pager__counter"
      data-theme="green-400"
      data-theme-dark="green-800"
      class="bgx-diagonal-stripes bgx-opacity-10"
    >
      {{ t('deck.mode-view.page-counter', { current: page + 1, total: total_pages }) }}
    </ui-tag>

    <ui-button
      data-testid="pager__prev"
      data-theme="brown-300"
      data-theme-dark="stone-700"
      icon-only
      size="sm"
      icon-left="arrow-left"
      :disabled="!can_paginate"
      @click="prevPage"
    >
      {{ t('deck-view.actions.prev-page', { page: prev_page_number }) }}
    </ui-button>

    <ui-button
      data-testid="pager__next"
      data-theme="brown-300"
      data-theme-dark="stone-700"
      icon-only
      size="sm"
      icon-left="arrow-right"
      :disabled="!can_paginate"
      @click="nextPage"
    >
      {{ t('deck-view.actions.next-page', { page: next_page_number }) }}
    </ui-button>
  </div>
</template>
