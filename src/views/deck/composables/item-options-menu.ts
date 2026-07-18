import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardEditorKey } from './list-controller'
import type { DropdownOption } from '@/components/ui-kit/dropdown-button/index.vue'

export type CardItemOptionsMenu = ReturnType<typeof useCardItemOptionsMenu>

/**
 * Per-card options (select / move / delete) shared by the grid item's hover
 * more-menu and the mobile long-press popover so the two entry points never
 * drift. Options are card-agnostic; the acting card id is passed to `onSelect`.
 */
export function useCardItemOptionsMenu() {
  const { t } = useI18n()
  const { actions } = inject(cardEditorKey)!

  const options = computed<DropdownOption[]>(() => [
    { label: t('deck-view.item-options.select'), value: 'select', icon: 'data-check' },
    { label: t('deck-view.item-options.move'), value: 'move', icon: 'move-item' },
    { label: t('deck-view.item-options.delete'), value: 'delete', icon: 'delete' }
  ])

  /** Dispatch a chosen option against `card_id`. */
  function onSelect(option: DropdownOption, card_id: number) {
    if (option.value === 'select') actions.onSelectCard(card_id)
    else if (option.value === 'move') actions.onMoveCards(card_id)
    else if (option.value === 'delete') actions.onDeleteCards(card_id)
  }

  return { options, onSelect }
}
