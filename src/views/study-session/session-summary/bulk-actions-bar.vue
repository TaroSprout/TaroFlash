<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiButton from '@/components/ui-kit/button.vue'
import UiTag from '@/components/ui-kit/tag.vue'
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

/** Positive select-all across the open category — no deck-wide except_ids concept here. */
function onToggleSelectAll() {
  if (selection.all_cards_selected.value) selection.clearSelectedCards()
  else selectAllSummaryCards()
}

function onCancel() {
  selection.exitSelection()
}
</script>

<template>
  <div
    data-testid="session-summary__bulk-actions"
    class="mx-auto flex w-full max-w-95 flex-col gap-2"
  >
    <div class="flex items-center justify-between gap-2">
      <ui-button
        neutral
        data-testid="session-summary__bulk-actions-cancel"
        icon-only
        icon-left="close"
        size="lg"
        @press="onCancel"
      >
        {{ t('session-summary.bulk-actions.cancel') }}
      </ui-button>

      <ui-tag
        data-testid="session-summary__bulk-actions-count"
        data-palette="purple"
        fill-height
        class="bgx-diagonal-stripes bgx-opacity-10"
      >
        {{ t('session-summary.bulk-actions.count', { count: selection.selected_count.value }) }}
      </ui-tag>
    </div>

    <div class="flex items-center gap-2">
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
  </div>
</template>
