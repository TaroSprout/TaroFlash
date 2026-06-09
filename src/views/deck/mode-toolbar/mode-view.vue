<script setup lang="ts">
import toolbarBase from './toolbar-base.vue'
import CardCount from './card-count.vue'
import PageSettings from './page-settings.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'
import { inject } from 'vue'
import { type CardListController } from '@/composables/card-editor/card-list-controller'

const { t } = useI18n()

const { addCard } = inject<CardListController>('card-editor')!
</script>

<template>
  <toolbar-base>
    <template #left>
      <ui-button
        data-testid="mode-view__search-button"
        data-theme="brown-300"
        data-theme-dark="stone-700"
        size="sm"
        icon-left="search"
        icon-only
      >
        {{ t('deck-view.mode-view.search') }}
      </ui-button>

      <page-settings />

      <ui-button
        data-testid="mode-view__add-card-button"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        size="sm"
        icon-left="add"
        @click="addCard()"
      >
        {{ t('deck-view.mode-view.new-card') }}
      </ui-button>
    </template>

    <template #right>
      <card-count />
    </template>
  </toolbar-base>
</template>
