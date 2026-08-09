import { computed, ref, shallowRef } from 'vue'
import { emitSfx } from '@/sfx/bus'
import { useModal } from '@/composables/modal'
import type { CardListController } from '@/views/deck/composables'
import { mobileCardEditorKey } from './mobile-card-editor-key'
import MobileEditor from './index.vue'

export type MobileCardEditor = ReturnType<typeof useMobileCardEditor>

export { mobileCardEditorKey }

type CardSide = 'front' | 'back'

// Add/remove image handlers for the active face, registered by the stage (which
// owns the uploader) and consumed by the header menu.
export type ImageControls = { openPicker: () => void; onRemove: () => void }

/**
 * Drives the deck view's focused single-card editor — the mobile-only
 * surface in the app dock that edits one face at a time and cycles prev/next.
 *
 * Holds no card data of its own: the cursor is a `client_id` into the
 * controller's `all_cards`, so it stays valid across the temp→persisted swap.
 */
export function useMobileCardEditor(controller: CardListController) {
  const cards = controller.list.all_cards

  const modal = useModal()
  let close_modal: (() => void) | null = null

  const cursor_client_id = ref<string | null>(null)
  const is_open = ref(false)
  const side = ref<CardSide>('front')
  const image_controls = shallowRef<ImageControls | null>(null)

  const index = computed(() => cards.value.findIndex((c) => c.client_id === cursor_client_id.value))
  const current = computed(() => (index.value >= 0 ? cards.value[index.value] : undefined))
  const has_prev = computed(() => index.value > 0)
  const has_next = computed(() => index.value >= 0 && index.value < cards.value.length - 1)

  const has_image = computed(() => {
    const card = current.value
    if (!card) return false
    return side.value === 'front' ? !!card.front_image_path : !!card.back_image_path
  })

  /** Open the editor focused on `client_id`, or the first card when omitted. */
  function open_at(client_id?: string) {
    const target = client_id ?? cards.value[0]?.client_id
    if (!target) return

    cursor_client_id.value = target
    side.value = 'front'
    is_open.value = true
    emitSfx('snappy_button_3')

    if (close_modal) return

    close_modal = modal.open(MobileEditor, {
      mode: 'popup',
      backdrop: true,
      context: { key: mobileCardEditorKey, value: api }
    }).close
  }

  function close() {
    close_modal?.()
  }

  /** The mobile "new card" intent: stage through the shared controller, then open focused on it. */
  async function openNewCard() {
    const client_id = await controller.addCard()
    if (!client_id) return

    open_at(client_id)
  }

  // Called by the modal wrapper's onUnmounted so state stays in sync no matter
  // how the modal actually closed (done button, esc, background tap).
  function onClosed() {
    close_modal = null
    is_open.value = false
    emitSfx('snappy_button_5')
  }

  function flip() {
    side.value = side.value === 'front' ? 'back' : 'front'
    emitSfx(side.value === 'back' ? 'transition_up' : 'transition_down')
  }

  // Always lands on the front, so each card opens the same way.
  function step(delta: number) {
    const next = cards.value[index.value + delta]
    if (!next) return

    cursor_client_id.value = next.client_id
    side.value = 'front'
  }

  function prev() {
    step(-1)
  }

  function next() {
    step(1)
  }

  // One side at a time — unlike the dual-editor list row, never both.
  function update(edited_side: CardSide, text: string) {
    const card = current.value
    if (!card) return

    return controller.updateCard(card.id!, { [`${edited_side}_text`]: text })
  }

  // Lands on whatever now sits at the removed card's old slot; closes once the deck is empty.
  function reconcileCursor(prev_index: number) {
    if (current.value) return
    if (!cards.value.length) return close()

    const landing = cards.value[Math.min(prev_index, cards.value.length - 1)]
    cursor_client_id.value = landing.client_id
    side.value = 'front'
  }

  async function moveCard() {
    const card = current.value
    if (!card) return

    const at = index.value
    await controller.actions.onMoveCards(card.id!)
    reconcileCursor(at)
  }

  async function deleteCard() {
    const card = current.value
    if (!card) return

    const at = index.value
    await controller.actions.onDeleteCards(card.id!)
    reconcileCursor(at)
  }

  const api = {
    side,
    cards,
    current,
    index,
    is_open,
    has_prev,
    has_next,
    has_image,
    image_controls,
    card_attributes: controller.card_attributes,
    saving: controller.saving,
    open_at,
    openNewCard,
    close,
    onClosed,
    flip,
    prev,
    next,
    update,
    moveCard,
    deleteCard
  }

  return api
}
