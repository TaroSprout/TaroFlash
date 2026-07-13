import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDeckActions } from '@/composables/deck/actions'
import { buildNewDeckPayload } from '@/utils/deck/defaults'
import { emitSfx } from '@/sfx/bus'

export function useNewDeckAction() {
  const { t } = useI18n()
  const deck_actions = useDeckActions()

  const creating_deck = ref(false)

  async function createNewDeck() {
    if (creating_deck.value) return

    creating_deck.value = true
    emitSfx('pop_up_pop')
    await deck_actions.createDeck(buildNewDeckPayload(t('deck.default-title')), {
      openSettingsAfterCreate: true
    })
    creating_deck.value = false
  }

  return { creating_deck, createNewDeck }
}
