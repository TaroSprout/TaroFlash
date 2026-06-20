import { type InjectionKey, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAlert } from '@/composables/alert'
import { useToast } from '@/composables/toast'
import type { DeckEditor } from '@/composables/deck/editor'

export type DeckDangerActions = {
  onDelete: () => Promise<void>
  onResetReviews: () => Promise<void>
  deleting: Ref<boolean>
  resetting_reviews: Ref<boolean>
}

export const deckDangerActionsKey = Symbol('deckDangerActions') as InjectionKey<DeckDangerActions>

/**
 * Destructive deck actions (delete deck, reset reviews) wrapped with
 * confirm-alert + toast feedback. Owns the post-delete navigation
 * (returns to dashboard when the user is on the deleted deck's page).
 *
 * Created once at the modal root and provided via `deckDangerActionsKey`
 * so any tab — the dedicated danger-zone tab or the tablet index — can
 * call the same handlers without re-wiring emit chains.
 */
export function useDeckDangerActions(
  editor: DeckEditor,
  deck: Deck,
  close: (response?: boolean) => void
): DeckDangerActions {
  const { t } = useI18n()
  const alert = useAlert()
  const toast = useToast()
  const router = useRouter()
  const route = useRoute()

  async function onResetReviews() {
    const confirmed = await alert.warn({
      title: t('alert.reset-reviews.title'),
      message: t('alert.reset-reviews.message'),
      confirmLabel: t('alert.reset-reviews.confirm')
    }).response
    if (!confirmed) return

    const ok = await editor.resetReviews()
    if (!ok) {
      toast.error(t('toast.error.reset-reviews-failed'))
      return
    }
    toast.success(t('toast.success.reset-reviews'))
  }

  async function onDelete() {
    const confirmed = await alert.warn({
      title: t('alert.delete-deck.title'),
      message: t('alert.delete-deck.message'),
      confirmLabel: t('alert.delete-deck.confirm'),
      confirmAudio: 'trash_crumple_short'
    }).response
    if (!confirmed) return

    const ok = await editor.deleteDeck()
    if (!ok) {
      toast.error(t('toast.error.deck-delete-failed'))
      return
    }

    close(true)

    const on_deleted_deck = route.name === 'deck' && Number(route.params.id) === deck.id
    if (on_deleted_deck) router.push({ name: 'dashboard' })
  }

  return {
    onDelete,
    onResetReviews,
    deleting: editor.deleting,
    resetting_reviews: editor.resetting_reviews
  }
}
