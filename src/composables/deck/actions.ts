import { useI18n } from 'vue-i18n'
import { useUpsertDeckMutation } from '@/api/decks'
// Trap: decks barrel cycle drops runtime exports →[K:decks-barrel-cycle-drops-runtime-exports]
// Straight from the defining module, not the barrel: the decks barrel and this
// composable form an import cycle, and a class read back through it is still
// uninitialised when the view loads.
import { DeckLimitError } from '@/api/decks/mutations/upsert'
import { useAlert } from '@/composables/alert'
import { useModal } from '@/composables/modal'
import { useCan } from '@/composables/can'
import { useNoticeStore } from '@/stores/notice-store'
import Checkout from '@/components/billing/checkout-modal/index.vue'

export function useDeckActions() {
  const { t } = useI18n()
  const alert = useAlert()
  const modal = useModal()
  const can = useCan()
  const notice = useNoticeStore()
  const upsert_mutation = useUpsertDeckMutation()

  /**
   * Shows the deck-limit alert (and Checkout on confirm) when the member is
   * at their plan's deck cap. UX only — enforcement lives server-side.
   */
  async function guardCreateDeck(): Promise<void> {
    const confirmed = await alert.warn({
      title: t('errors.deck-limit-reached.title'),
      message: t('errors.deck-limit-reached.message'),
      confirmLabel: t('errors.deck-limit-reached.upgrade-cta')
    }).response
    if (confirmed) {
      modal.open(Checkout, { mode: 'mobile-sheet', backdrop: true })
    }
  }

  /**
   * Create a new deck. Renders it into the grid immediately (pending, dimmed)
   * on the cached deck-limit check; a member already known to be at their cap
   * never sees it. Returns null if the plan's deck limit blocks it (before or
   * after the authoritative re-check) or the write fails.
   */
  async function createDeck(deck: Deck): Promise<Deck | null> {
    if (!can.createDeck.value) {
      await guardCreateDeck()
      return null
    }

    try {
      return await upsert_mutation.mutateAsync(deck)
    } catch (error) {
      if (error instanceof DeckLimitError) {
        await guardCreateDeck()
      } else {
        notice.error(t('toast.error.deck-create-failed'))
      }
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
