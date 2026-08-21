<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import { emitSfx } from '@/sfx/bus'
import { useInjectedStudySessionController } from '../composables/session-controller'

const { t } = useI18n()

const {
  summary_selection: selection,
  selectAllSummaryCards,
  onDeleteSummarySelected,
  onMoveSummarySelected
} = useInjectedStudySessionController()

const has_selection = computed(() => selection.selected_count.value > 0)

const select_all_label = computed(() =>
  selection.all_cards_selected.value
    ? t('session-summary.bulk-actions.deselect-all')
    : t('session-summary.bulk-actions.select-all')
)

/**
 * Positive select-all across the open category — no deck-wide except_ids
 * concept here. Plays the same select sfx as deck-view's
 * `useBulkActions.onToggleSelectAll`.
 */
function onToggleSelectAll() {
  emitSfx('ui.select')
  if (selection.all_cards_selected.value) selection.clearSelectedCards()
  else selectAllSummaryCards()
}
</script>

<template>
  <div
    data-testid="session-summary__bulk-actions"
    class="mx-auto flex w-full max-w-95 items-center gap-2"
  >
    <ui-button
      neutral
      data-testid="session-summary__bulk-actions-select-all"
      icon-only
      :icon-left="selection.all_cards_selected.value ? 'close-window-remove' : 'data-check'"
      size="lg"
      @press="onToggleSelectAll"
    >
      {{ select_all_label }}
    </ui-button>

    <ui-button
      data-testid="session-summary__bulk-actions-move"
      icon-left="move-item"
      data-palette="blue"
      full-width
      size="lg"
      :disabled="!has_selection"
      @press="onMoveSummarySelected"
    >
      {{ t('session-summary.bulk-actions.move') }}
    </ui-button>

    <ui-button
      data-testid="session-summary__bulk-actions-delete"
      icon-left="delete"
      data-palette="danger"
      full-width
      size="lg"
      :disabled="!has_selection"
      @press="onDeleteSummarySelected"
    >
      {{ t('session-summary.bulk-actions.delete') }}
    </ui-button>
  </div>
</template>
