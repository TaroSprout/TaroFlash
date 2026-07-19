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
      <search-bar />

      <page-settings />

      <ui-button
        data-testid="mode-view__add-card-button"
        data-palette="brand"
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
