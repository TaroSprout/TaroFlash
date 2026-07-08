import { useModal } from '@/composables/modal'
import { emitSfx } from '@/sfx/bus'
import DeckSettings, {
  type ActiveTab,
  type DeckSettingsResponse
} from '@/components/modals/deck-settings/index.vue'

type OpenOptions = {
  tab?: ActiveTab
  side?: CardSide
}

/** Opens the deck-settings modal. */
export function useDeckSettingsModal() {
  const modal = useModal()

  /**
   * @param options - jump straight to a tab and/or preselect a card face
   *   (e.g. `{ tab: 'design', side: 'front' }`); both override any persisted state.
   */
  function open(deck: Deck, options: OpenOptions = {}) {
    emitSfx('snappy_button_3')
    const result = modal.open<DeckSettingsResponse>(DeckSettings, {
      backdrop: true,
      mode: 'mobile-sheet',
      mobile_below_width: 'md',
      mobile_below_height: 'md',
      props: { deck, initial_tab: options.tab, initial_side: options.side }
    })
    result.response.then(() => emitSfx('snappy_button_5'))
    return result
  }

  return { open }
}
