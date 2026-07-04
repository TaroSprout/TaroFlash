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
  <div
    data-testid="deck-footer-bulk-actions"
    class="flex w-full items-center gap-2 px-(--dock-px) pt-(--dock-pt) pb-(--dock-pb)"
  >
    <ui-button
      data-testid="deck-footer-bulk-actions__cancel"
      icon-only
      icon-left="close"
      data-theme="brown-200"
      data-theme-dark="stone-700"
      size="lg"
      @press="onCancel"
    >
      {{ t('deck-view.bulk-actions.cancel') }}
    </ui-button>

    <ui-button
      data-testid="deck-footer-bulk-actions__select-all"
      icon-only
      :icon-left="all_cards_selected ? 'close-window-remove' : 'data-check'"
      data-theme="brown-200"
      data-theme-dark="stone-700"
      size="lg"
      @press="onToggleSelectAll"
    >
      {{ select_all_label }}
    </ui-button>

    <ui-button
      data-testid="deck-footer-bulk-actions__move"
      icon-left="move-item"
      data-theme="blue-500"
      data-theme-dark="blue-650"
      full-width
      size="lg"
      :disabled="!has_selection"
      @press="actions.onMoveCards()"
    >
      {{ t('deck-view.bulk-actions.move') }}
    </ui-button>

    <ui-button
      data-testid="deck-footer-bulk-actions__delete"
      icon-left="delete"
      data-theme="red-500"
      data-theme-dark="red-700"
      full-width
      size="lg"
      :disabled="!has_selection"
      @press="actions.onDeleteCards()"
    >
      {{ t('deck-view.bulk-actions.delete') }}
    </ui-button>
  </div>
</template>
