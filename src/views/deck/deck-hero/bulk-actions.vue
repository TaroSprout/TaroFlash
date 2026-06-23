<script setup lang="ts">
import UiButton from '@/components/ui-kit/button.vue'
import { useI18n } from 'vue-i18n'
import { useBulkActions } from '@/views/deck/composables'

const { t } = useI18n()

const {
  actions,
  all_cards_selected,
  has_selection,
  select_all_label,
  onToggleSelectAll,
  onCancel
} = useBulkActions()
</script>

<template>
  <div data-testid="bulk-actions" class="flex flex-col gap-2 w-full">
    <ui-button
      data-testid="bulk-actions__cancel"
      data-theme="brown-300"
      data-theme-dark="stone-700"
      full-width
      size="xl"
      icon-left="close"
      @press="onCancel"
    >
      {{ t('deck-view.bulk-actions.cancel') }}
    </ui-button>

    <ui-button
      data-testid="bulk-actions__select-all"
      data-theme="brown-300"
      data-theme-dark="stone-700"
      full-width
      size="xl"
      :icon-left="all_cards_selected ? 'check-box' : 'check-box-outline-blank'"
      @press="onToggleSelectAll"
    >
      {{ select_all_label }}
    </ui-button>

    <ui-button
      data-testid="bulk-actions__move"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      full-width
      size="xl"
      icon-left="move-item"
      :disabled="!has_selection"
      @press="actions.onMoveCards()"
    >
      {{ t('deck-view.bulk-actions.move') }}
    </ui-button>

    <ui-button
      data-testid="bulk-actions__delete"
      data-theme="red-500"
      data-theme-dark="red-700"
      full-width
      size="xl"
      icon-left="delete"
      :disabled="!has_selection"
      @press="actions.onDeleteCards()"
    >
      {{ t('deck-view.bulk-actions.delete') }}
    </ui-button>
  </div>
</template>
