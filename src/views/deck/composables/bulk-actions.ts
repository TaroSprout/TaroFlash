import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { emitSfx } from '@/sfx/bus'
import { cardEditorKey } from './list-controller'

/**
 * Reactive labels + handlers shared by the bulk-actions stack (deck hero
 * overlay + mobile dock) — both surfaces drive the same selection state.
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
    all_cards_selected: selection.all_cards_selected,
    has_selection,
    select_all_label,
    onToggleSelectAll,
    onCancel: actions.onCancelSelection
  }
}
