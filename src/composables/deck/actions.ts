import { useI18n } from 'vue-i18n'
import { useMemberDeckCountQuery, useUpsertDeckMutation } from '@/api/decks'
import { useAlert } from '@/composables/alert'
import { useModal } from '@/composables/modal'
import { useCan } from '@/composables/can'
import { useDeckSettingsModal } from '@/composables/deck/settings-modal'
import { waitForDeckPopIn } from '@/utils/animations/deck-grid'
import Checkout from '@/components/billing/checkout-modal/index.vue'

type CreateDeckOptions = {
  // Wait for the new deck's grid pop-in animation to finish, then open its
  // settings modal — for entry points other than the deck grid's own "new
  // deck" card, which stays on the grid and doesn't need this.
  openSettingsAfterCreate?: boolean
}

export function useDeckActions() {
  const { t } = useI18n()
  const alert = useAlert()
  const modal = useModal()
  const can = useCan()
  const deck_settings_modal = useDeckSettingsModal()
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

  /**
   * Create a new deck. Returns null if the plan's deck limit blocks it or the
   * write fails.
   *
   * @param options.openSettingsAfterCreate - wait for the grid pop-in
   *   animation to finish, then open the deck-settings modal for it.
   */
  async function createDeck(deck: Deck, options: CreateDeckOptions = {}): Promise<Deck | null> {
    if (!(await guardCreateDeck())) return null

    let created: Deck | null
    try {
      created = await upsert_mutation.mutateAsync(deck)
    } catch {
      return null
    }

    if (created && options.openSettingsAfterCreate) {
      await waitForDeckPopIn(created.id)
      deck_settings_modal.open(created)
    }

    return created
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
