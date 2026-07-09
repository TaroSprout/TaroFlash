import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardEditorKey } from './list-controller'
import { deckViewShellKey } from './view-shell'
import { mobileCardEditorKey } from '@/views/deck/mobile-editor/use-mobile-card-editor'
import { useDeckSettingsModal } from '@/composables/deck/settings-modal'
import { useDeckQuery } from '@/api/decks'
import { useMatchMedia } from '@/composables/ui/media-query'
import type { DropdownOption } from '@/components/ui-kit/dropdown-button/index.vue'

export type CardEditMenu = ReturnType<typeof useCardEditMenu>

/**
 * Shared wiring for the deck view's edit affordance, used by both the desktop
 * deck-hero dropdown and the mobile footer dropdown so their options and actions
 * never drift. `options` covers select / rearrange / appearance (the trigger-only
 * footer prepends its own `edit` entry). `primaryAction`/`startEditing` are the
 * primary edit action — the dock editor below md, desktop edit mode at md+.
 *
 * The rearrange option disables itself while rearranging: stopping happens via
 * the yellow primary button (desktop) or footer button (mobile), not from here.
 */
export function useCardEditMenu() {
  const { t } = useI18n()
  const editor = inject(cardEditorKey, null)
  const shell = inject(deckViewShellKey, null)
  const mobile_editor = inject(mobileCardEditorKey, null)
  const settings = useDeckSettingsModal()
  const is_mobile = useMatchMedia('w<md')

  const deck_query = useDeckQuery(() => editor?.deck_id ?? -1)

  const is_editing = computed(() => shell?.mode.value === 'edit')
  const is_rearranging = computed(() => !!shell?.is_rearranging.value)

  const options = computed<DropdownOption[]>(() => [
    { label: t('deck-view.actions.select-cards'), value: 'select', icon: 'data-check' },
    {
      label: t('deck-view.actions.reorder-cards'),
      value: 'rearrange',
      icon: 'rearrange',
      disabled: is_rearranging.value
    },
    {
      label: t('deck-view.actions.edit-card-appearance'),
      value: 'appearance',
      icon: 'align-horizontal-frame'
    }
  ])

  /** Enter editing: the dock editor below md, desktop edit mode at md+. */
  function startEditing() {
    if (is_mobile.value) mobile_editor?.open_at()
    else shell?.toggleMode('edit')
  }

  /** Primary button behaviour: stop the active mode first, else start editing. */
  function primaryAction() {
    if (is_rearranging.value) shell?.toggleRearrange()
    else startEditing()
  }

  function openAppearance() {
    const deck = deck_query.data.value
    if (deck) settings.open(deck, { tab: 'design', side: 'front' })
  }

  /** Dispatch a chosen menu option. `edit` only appears in trigger-only menus. */
  function onSelect(option: DropdownOption) {
    if (option.value === 'edit') startEditing()
    else if (option.value === 'select') editor?.actions.onSelectCard()
    else if (option.value === 'rearrange') shell?.toggleRearrange()
    else if (option.value === 'appearance') openAppearance()
  }

  return { options, is_editing, is_rearranging, startEditing, primaryAction, onSelect }
}
