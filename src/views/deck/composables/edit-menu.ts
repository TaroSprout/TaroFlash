import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardEditorKey } from './list-controller'
import { deckViewShellKey } from './view-shell'
import { useEditorSurface } from './editor-surface'
import { useDeckSettingsModal } from '@/composables/deck/settings-modal'
import { useDeckQuery } from '@/api/decks'
import type { DropdownOption } from '@/components/ui-kit/dropdown-button/index.vue'

export type CardEditMenu = ReturnType<typeof useCardEditMenu>

/**
 * Shared wiring for the deck view's edit affordance, used by both the desktop
 * deck-hero dropdown and the mobile footer dropdown so their options and
 * actions never drift.
 *
 * All options disable while rearranging — nothing else in the menu should be reachable mid-drag.
 */
export function useCardEditMenu() {
  const { t } = useI18n()
  const editor = inject(cardEditorKey, null)
  const shell = inject(deckViewShellKey, null)
  const surface = useEditorSurface()
  const settings = useDeckSettingsModal()

  const deck_query = useDeckQuery(() => editor?.deck_id ?? -1)

  const is_editing = computed(() => shell?.mode.value === 'edit')
  const is_rearranging = computed(() => !!shell?.is_rearranging.value)
  const has_no_cards = computed(() => (deck_query.data.value?.card_count ?? 0) === 0)

  const options = computed<DropdownOption[]>(() => [
    {
      label: t('deck-view.actions.select-cards'),
      value: 'select',
      icon: 'data-check',
      disabled: is_rearranging.value
    },
    {
      label: t('deck-view.actions.reorder-cards'),
      value: 'rearrange',
      icon: 'rearrange',
      disabled: is_rearranging.value
    },
    {
      label: t('deck-view.actions.import-cards'),
      value: 'import',
      icon: 'card-place',
      disabled: is_rearranging.value
    },
    {
      label: t('deck-view.actions.export-cards'),
      value: 'export',
      icon: 'card-lift',
      disabled: is_rearranging.value || has_no_cards.value
    },
    {
      label: t('deck-view.actions.edit-card-appearance'),
      value: 'appearance',
      icon: 'align-horizontal-frame',
      disabled: is_rearranging.value
    }
  ])

  /** Primary button behaviour: stop the active mode first, else start editing. */
  function primaryAction() {
    if (is_rearranging.value) shell?.toggleRearrange()
    else surface.startEditing()
  }

  function openAppearance() {
    const deck = deck_query.data.value
    if (deck) settings.open(deck, { tab: 'design', side: 'front' })
  }

  /** Dispatch a chosen menu option. `edit` only appears in trigger-only menus. */
  function onSelect(option: DropdownOption) {
    if (option.value === 'edit') surface.startEditing()
    else if (option.value === 'select') editor?.actions.onSelectCard()
    else if (option.value === 'rearrange') shell?.toggleRearrange()
    else if (option.value === 'import') shell?.setMode('import')
    else if (option.value === 'export') editor?.actions.onExportCards()
    else if (option.value === 'appearance') openAppearance()
  }

  return {
    options,
    is_editing,
    is_rearranging,
    startEditing: surface.startEditing,
    primaryAction,
    onSelect
  }
}
