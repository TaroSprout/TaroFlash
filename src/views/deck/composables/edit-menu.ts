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
 * deck-hero dropdown and the mobile footer dropdown so their options and actions
 * never drift. `options` covers select / rearrange / appearance (the trigger-only
 * footer prepends its own `edit` entry). `primaryAction`/`startEditing` are the
 * primary edit action — the dock editor below md, desktop edit mode at md+.
 *
 * All options disable while rearranging — bulk-select toggles don't work
 * mid-drag, so nothing else in the menu should be reachable either. Stopping
 * happens via the yellow primary button (desktop) or footer button (mobile).
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
