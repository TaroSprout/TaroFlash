<script setup lang="ts">
import ToolbarBase from './toolbar-base.vue'
import PageSettings from './page-settings.vue'
import SearchBar from '@/views/deck/search-bar.vue'
import UiButton from '@/components/ui-kit/button.vue'
import UiTag from '@/components/ui-kit/tag.vue'
import { useI18n } from 'vue-i18n'
import { useBulkActions } from '@/views/deck/composables'

const { t } = useI18n()

const {
  actions,
  selection,
  all_cards_selected,
  has_selection,
  select_all_label,
  onToggleSelectAll,
  onCancel
} = useBulkActions()
</script>

<template>
  <toolbar-base data-testid="mode-select">
    <template #left>
      <search-bar />

      <page-settings />
    </template>

    <template #right>
      <ui-button
        neutral
        data-testid="mode-select__cancel-button"
        icon-only
        icon-left="close"
        @press="onCancel"
      >
        {{ t('deck-view.bulk-actions.cancel') }}
      </ui-button>

      <ui-button
        neutral
        data-testid="mode-select__select-all-button"
        :icon-left="all_cards_selected ? 'close-window-remove' : 'data-check'"
        @press="onToggleSelectAll"
      >
        {{ select_all_label }}
      </ui-button>

      <ui-button
        data-testid="mode-select__move-button"
        data-palette="blue"
        icon-left="move-item"
        :disabled="!has_selection"
        @press="actions.onMoveCards()"
      >
        {{ t('deck-view.bulk-actions.move-deck') }}
      </ui-button>

      <ui-button
        data-testid="mode-select__delete-button"
        data-palette="danger"
        icon-left="delete"
        :disabled="!has_selection"
        @press="actions.onDeleteCards()"
      >
        {{ t('deck-view.bulk-actions.delete') }}
      </ui-button>

      <ui-tag
        data-testid="mode-select__count"
        data-palette="purple"
        fill-height
        class="bgx-diagonal-stripes bgx-opacity-10"
      >
        {{ t('deck-view.bulk-actions.count', { count: selection.selected_count.value }) }}
      </ui-tag>
    </template>
  </toolbar-base>
</template>
