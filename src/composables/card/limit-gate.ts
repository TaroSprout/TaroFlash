import { toValue, type MaybeRefOrGetter } from 'vue'
import { useI18n } from 'vue-i18n'
import Checkout from '@/components/billing/checkout-modal/index.vue'
import { useAlert } from '@/composables/alert'
import { useModal } from '@/composables/modal'
import { useCan } from '@/composables/can'

// Raised by `enforce_deck_card_limit` when a write exceeds the plan's card cap. →[K:card-limit-custom-errcode]
const CARD_LIMIT_ERRCODE = 'PT402'

/** True when `error` is the backend's per-deck card-limit rejection. */
function isCardLimitError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === CARD_LIMIT_ERRCODE
  )
}

/**
 * Gate for the per-deck card cap (plan-defined; see `can.addCards`).
 * Mirrors `useCardImageGate` / `useDeckActions.guardCreateDeck`: the FE check is
 * UX only — the real boundary is `enforce_deck_card_limit` in the insert RPCs.
 * Free members who hit the cap get an upgrade alert that opens Checkout.
 *
 * Lives outside `useCan` because reading the deck's live `card_count` is
 * per-deck and contextual — `useCan.addCards` only owns the cap comparison.
 *
 * @param deck - The deck being added to. Read reactively so the cap tracks the
 *   deck's live `card_count` as cards are inserted/removed.
 */
export function useCardLimitGate(deck: MaybeRefOrGetter<Deck | undefined>) {
  const { t } = useI18n()
  const alert = useAlert()
  const modal = useModal()
  const can = useCan()

  async function promptUpgrade(): Promise<void> {
    const confirmed = await alert.warn({
      title: t('errors.card-limit-reached.title'),
      message: t('errors.card-limit-reached.message'),
      confirmLabel: t('errors.card-limit-reached.upgrade-cta')
    }).response

    if (confirmed) modal.open(Checkout, { mode: 'mobile-sheet', backdrop: true })
  }

  /**
   * Resolve `true` when `adding` more cards keeps the deck within its plan cap.
   * For a member who would exceed it, shows the upgrade alert (opening Checkout
   * on confirm) and resolves `false` — the caller should abort the insert.
   */
  async function guardAddCards(adding = 1): Promise<boolean> {
    const count = toValue(deck)?.card_count ?? 0
    if (can.addCards(count, adding)) return true

    await promptUpgrade()
    return false
  }

  /**
   * Safety net for writes that slip past `guardAddCards` (stale `card_count`,
   * concurrent edits) and get rejected by the backend. Surfaces the same
   * upgrade alert and returns `true` when it handled the error; callers should
   * fall through to their generic error path when it returns `false`.
   */
  function handleLimitError(error: unknown): boolean {
    if (!isCardLimitError(error)) return false

    void promptUpgrade()
    return true
  }

  return { guardAddCards, handleLimitError }
}
