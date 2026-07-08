import { useI18n } from 'vue-i18n'
import { useMemberDeckCountQuery, useUpsertDeckMutation } from '@/api/decks'
import { useAlert } from '@/composables/alert'
import { useModal } from '@/composables/modal'
import { useCan } from '@/composables/can'
import Checkout from '@/components/modals/checkout/index.vue'

export function useDeckActions() {
  const { t } = useI18n()
  const alert = useAlert()
  const modal = useModal()
  const can = useCan()
  const deck_count_query = useMemberDeckCountQuery()
  const upsert_mutation = useUpsertDeckMutation()

  async function guardCreateDeck(): Promise<boolean> {
    await deck_count_query.refresh()
    if (can.createDeck.value) return true

    const confirmed = await alert.warn({
      title: t('errors.deck-limit-reached.title'),
      message: t('errors.deck-limit-reached.message'),
      confirmLabel: t('errors.deck-limit-reached.upgrade-cta')
    }).response
    if (confirmed) {
      modal.open(Checkout, { mode: 'mobile-sheet', backdrop: true })
    }
    return false
  }

  /** Create a new deck. Returns null if the plan's deck limit blocks it or the write fails. */
  async function createDeck(deck: Deck): Promise<Deck | null> {
    if (!(await guardCreateDeck())) return null

    try {
      return await upsert_mutation.mutateAsync(deck)
    } catch {
      return null
    }
  }

  /** Persist changes to an existing deck. Returns null if the write fails. */
  async function updateDeck(deck: Deck): Promise<Deck | null> {
    try {
      return await upsert_mutation.mutateAsync(deck)
    } catch {
      return null
    }
  }

  return { guardCreateDeck, createDeck, updateDeck }
}
