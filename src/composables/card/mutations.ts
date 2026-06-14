import { toValue, type MaybeRefOrGetter } from 'vue'
import {
  useDeleteCardImageMutation,
  useDeleteCardsMutation,
  useDeleteCardsInDeckMutation,
  useInsertCardAtMutation,
  useMoveCardsToDeckMutation,
  useSaveCardMutation,
  useSetCardImageMutation,
  type InsertCardAtParams,
  type MoveCardsToDeckVars
} from '@/api/cards'

export type CardMutations = ReturnType<typeof useCardMutations>

type DeleteArgs = { cards: Card[] } | { except_ids: number[] }

/**
 * Persistence wrappers for card writes. A thin layer over `@/api/cards`
 * mutation hooks: takes the raw shapes the API expects and returns the
 * results, with no knowledge of the deck-editor's UI state, list shape, or
 * temp-card lifecycle.
 *
 * Higher-level orchestration (insert vs update routing, optimistic state,
 * the in-flight saving flag) lives on `useCardListController`.
 *
 * @param deck_id - Reactive deck id, required for INSERT and bulk-delete.
 */
export function useCardMutations(deck_id: MaybeRefOrGetter<number | undefined>) {
  const insert_mutation = useInsertCardAtMutation()
  const save_mutation = useSaveCardMutation()
  const delete_mutation = useDeleteCardsMutation()
  const delete_in_deck_mutation = useDeleteCardsInDeckMutation()
  const move_mutation = useMoveCardsToDeckMutation()
  const set_image_mutation = useSetCardImageMutation()
  const delete_image_mutation = useDeleteCardImageMutation()

  /** Insert a new card at the anchor + side described by `params`. */
  function insertCard(params: InsertCardAtParams): Promise<{ id: number; rank: number }> {
    return insert_mutation.mutateAsync(params)
  }

  /** Persist `values` against an existing card. */
  function saveCard(card: Card, values: Partial<Card>): Promise<unknown> {
    return save_mutation.mutateAsync({ card, values })
  }

  /**
   * Delete a discriminated set of cards.
   *
   * - `{ cards }`      — delete this explicit list. No-op if empty.
   * - `{ except_ids }` — delete every card in the deck except these. Used
   *                      by the select-all flow so the FE doesn't have to
   *                      enumerate every id.
   */
  async function deleteCards(args: DeleteArgs) {
    if ('except_ids' in args) {
      await delete_in_deck_mutation.mutateAsync({
        deck_id: toValue(deck_id)!,
        except_ids: args.except_ids
      })

      return
    }

    if (args.cards.length === 0) return
    await delete_mutation.mutateAsync(args.cards)
  }

  /** Move cards into the target deck. Vars are passed straight through. */
  async function moveCards(vars: MoveCardsToDeckVars) {
    if ('card_ids' in vars && vars.card_ids.length === 0) return
    await move_mutation.mutateAsync(vars)
  }

  /** Upload and attach an image to one face of a card. */
  function setCardImage(card_id: number, side: 'front' | 'back', file: File): Promise<unknown> {
    return set_image_mutation.mutateAsync({ card_id, deck_id: toValue(deck_id)!, file, side })
  }

  /** Remove the image from one face of a card. */
  function deleteCardImage(card_id: number, side: 'front' | 'back'): Promise<unknown> {
    return delete_image_mutation.mutateAsync({ card_id, deck_id: toValue(deck_id)!, side })
  }

  return { insertCard, saveCard, deleteCards, moveCards, setCardImage, deleteCardImage }
}
