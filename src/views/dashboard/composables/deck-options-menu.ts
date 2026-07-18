import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAlert } from '@/composables/alert'
import { useNoticeStore } from '@/stores/notice-store'
import { useDeleteDeckMutation } from '@/api/decks'
import { useDeckSettingsModal } from '@/composables/deck/settings-modal'
import type { DropdownOption } from '@/components/ui-kit/dropdown-button/index.vue'

export type DeckOptionsMenu = ReturnType<typeof useDeckOptionsMenu>

type DeckOptionsMenuConfig = {
  // Enter the dashboard's rearrange (editing) mode. Owned by the dashboard
  // view; the grid forwards it up so this composable never touches that state.
  onRearrange: () => void
}

/**
 * Per-deck options (settings / rearrange / delete) shared by the deck
 * card's gear dropdown and the mobile long-press popover so the two entry points
 * never drift. Options are deck-agnostic; the acting deck is passed to
 * `onSelect`, which lets a single popover instance serve every card.
 *
 * @example
 * const { options, onSelect } = useDeckOptionsMenu({ onRearrange: () => emit('rearrange') })
 * // <dropdown-menu :options="options" @select="onSelect($event, deck)" />
 */
export function useDeckOptionsMenu({ onRearrange }: DeckOptionsMenuConfig) {
  const { t } = useI18n()
  const alert = useAlert()
  const notice = useNoticeStore()
  const delete_mutation = useDeleteDeckMutation()
  const settings_modal = useDeckSettingsModal()

  const options = computed<DropdownOption[]>(() => [
    { label: t('dashboard.deck-options.settings'), value: 'settings', icon: 'build' },
    { label: t('dashboard.deck-options.rearrange'), value: 'rearrange', icon: 'rearrange' },
    { label: t('dashboard.deck-options.delete'), value: 'delete', icon: 'delete' }
  ])

  /** Dispatch a chosen option against `deck`. */
  function onSelect(option: DropdownOption, deck: Deck) {
    if (option.value === 'settings') settings_modal.open(deck)
    else if (option.value === 'rearrange') onRearrange()
    else if (option.value === 'delete') deleteDeck(deck)
  }

  /** Confirm-then-delete, mirroring the danger-zone delete flow (no post-delete
   *  nav — the dashboard is never on the deleted deck's page). */
  async function deleteDeck(deck: Deck) {
    const confirmed = await alert.warn({
      title: t('alert.delete-deck.title'),
      message: t('alert.delete-deck.message'),
      confirmLabel: t('alert.delete-deck.confirm'),
      confirmAudio: 'trash_crumple_short'
    }).response
    if (!confirmed) return

    try {
      await delete_mutation.mutateAsync(deck.id)
    } catch {
      notice.error(t('toast.error.deck-delete-failed'), { variant: 'panel' })
    }
  }

  return { options, onSelect }
}
