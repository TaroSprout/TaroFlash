import { useOverlay } from '@/composables/overlay/use-overlay'
import DeckSettings, {
  type ActivePage,
  type DeckSettingsResponse
} from '@/views/deck/deck-settings/index.vue'

type OpenOptions = {
  tab?: ActivePage
  side?: CardSide
}

/** Opens the deck-settings modal. */
export function useDeckSettingsModal() {
  const { open } = useOverlay()

  /**
   * @param options - jump straight to a page and/or preselect a card face
   *   (e.g. `{ tab: 'design', side: 'front' }`); both override any persisted state.
   */
  function open_deck_settings(deck: Deck, options: OpenOptions = {}) {
    return open<DeckSettingsResponse>(DeckSettings, {
      props: { deck, initial_page: options.tab, initial_side: options.side },
      presentation: 'dialog',
      open_sfx: 'dialog.open',
      close_sfx: 'dialog.close'
    })
  }

  return { open: open_deck_settings }
}
