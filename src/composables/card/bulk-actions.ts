import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { emitSfx } from '@/sfx/bus'
import { cardEditorKey } from './list-controller'

/**
 * Reactive labels + handlers shared by the bulk-actions stack and the
 * bulk-toolbar. Both surfaces drive the same selection state, so they
 * share the same `select-all` toggling, cancel sfx, and label flipping.
 *
 * @example
 * const { selected_count, select_all_label, has_selection,
 *         onToggleSelectAll, onCancel } = useBulkActions()
 */
export function useBulkActions() {
  const { t } = useI18n()
  const { selection, actions } = inject(cardEditorKey)!

  const has_selection = computed(
    () => selection.select_all_mode.value || selection.selected_count.value > 0
  )

  const select_all_label = computed(() =>
    selection.all_cards_selected.value
      ? t('deck-view.bulk-actions.deselect-all')
      : t('deck-view.bulk-actions.select-all')
  )

  /** Toggle deck-wide selection; plays the standard select sfx. */
  function onToggleSelectAll() {
    emitSfx('ui.select')
    selection.toggleSelectAll()
  }

  return {
    selection,
    actions,
    selected_count: selection.selected_count,
    all_cards_selected: selection.all_cards_selected,
    has_selection,
    select_all_label,
    onToggleSelectAll,
    onCancel: actions.onCancelSelection
  }
}
