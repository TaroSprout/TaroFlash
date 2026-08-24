import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDeckActions } from '@/composables/deck/actions'
import { buildNewDeckPayload } from '@/utils/deck/defaults'
import { emitSfx } from '@/sfx/bus'

// Module-level so the grid's "+" card, the mobile footer button, and the
// actions-panel entry — three separate call sites — share one guard; a
// create started from one can't be doubled from another.
const creating_deck = ref(false)

export function useNewDeckAction() {
  const { t } = useI18n()
  const deck_actions = useDeckActions()

  async function createNewDeck() {
    if (creating_deck.value) return

    creating_deck.value = true
    emitSfx('dialog.open')
    await deck_actions.createDeck(buildNewDeckPayload(t('deck.default-title')))
    creating_deck.value = false
  }

  return { creating_deck, createNewDeck }
}
