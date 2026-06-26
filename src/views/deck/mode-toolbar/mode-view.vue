<script setup lang="ts">
import toolbarBase from './toolbar-base.vue'
import CardCount from './card-count.vue'
import PageSettings from './page-settings.vue'
import SearchBar from '@/views/deck/search-bar.vue'
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'
import { inject } from 'vue'
import { cardEditorKey } from '@/views/deck/composables'

const { t } = useI18n()

const { newCard } = inject(cardEditorKey)!
</script>

<template>
  <toolbar-base>
    <template #left>
      <search-bar size="sm" data-theme="brown-300" data-theme-dark="stone-700" />

      <page-settings />

      <ui-button
        data-testid="mode-view__add-card-button"
        data-theme="blue-500"
        data-theme-dark="blue-650"
        size="sm"
        icon-left="add"
        @press="newCard"
      >
        {{ t('deck-view.mode-view.new-card') }}
      </ui-button>
    </template>

    <template #right>
      <card-count />
    </template>
  </toolbar-base>
</template>
