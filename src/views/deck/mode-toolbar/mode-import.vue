<script setup lang="ts">
import ToolbarBase from './toolbar-base.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiSelectMenu from '@/components/ui-kit/select-menu.vue'
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardImportKey, type CardImportLayout } from '@/views/deck/composables/card-import'

const { t } = useI18n()

const draft = inject(cardImportKey)!

const layout_options = computed<{ value: CardImportLayout; label: string }[]>(() => [
  { value: 'grid', label: t('deck-view.card-import.layout.grid') },
  { value: 'list', label: t('deck-view.card-import.layout.list') }
])
</script>

<template>
  <toolbar-base data-testid="mode-import">
    <template #left>
      <ui-button
        neutral
        data-testid="mode-import__close-button"
        icon-only
        icon-left="close"
        @press="draft.dismiss"
      >
        {{ t('deck-view.card-import.close') }}
      </ui-button>
    </template>

    <template #right>
      <ui-select-menu
        data-testid="mode-import__layout"
        :options="layout_options"
        :disabled="!draft.has_cards.value"
        :model-value="draft.layout.value"
        @update:model-value="draft.setLayout"
      />
    </template>
  </toolbar-base>
</template>
