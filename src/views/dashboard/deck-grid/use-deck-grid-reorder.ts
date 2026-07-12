import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type MaybeRefOrGetter,
  type Ref,
  toValue
} from 'vue'
import { useMoveDeckMutation } from '@/api/decks'
import { useNoticeStore } from '@/stores/notice-store'
import { useI18n } from 'vue-i18n'
import { liftListItem, dropListItem } from '@/utils/animations/list-item'
import { useReorderDrag } from '@/composables/use-reorder-drag'
import { resolveReorderAnchor } from '@/utils/reorder'
import { useDeckGrid } from './use-deck-grid'

// Touch picks a card up on a press-and-hold (like iOS), so a plain swipe still
// scrolls the page; a small finger move within the window aborts the hold.
const HOLD_MS = 200
const HOLD_TOLERANCE = 8

/**
 * Drag-to-reorder for the dashboard deck grid: geometry, pointer/touch
 * handling, idle jiggle styling, and the `move_deck` mutation call. Mirrors
 * the deck-view card grid's reorder feel (`views/deck/card-grid/scroll-grid.vue`),
 * minus virtualization — the dashboard's deck count doesn't need it, so
 * positions come from the fixed per-breakpoint card size instead of DOM
 * measurement.
 */
export function useDeckGridReorder(
  container_el: Ref<HTMLElement | null>,
  decks: MaybeRefOrGetter<Deck[]>,
  editing: MaybeRefOrGetter<boolean>,
  size: MaybeRefOrGetter<'base' | 'sm'>
) {
  const { t } = useI18n()
  const notice = useNoticeStore()
  const move_deck_mutation = useMoveDeckMutation()

  const container_width = ref(0)
  // container_width starts at 0, so columns/row_count fall back to a single
  // tall column for one frame — gate the rendered height on this so a refresh
  // never briefly renders (and lays out scroll restoration against) a page
  // several times its real height.
  const measured = computed(() => container_width.value > 0)

  const { cell_width, gap_x, columns, row_count, row_pitch, itemPosition } = useDeckGrid(
    size,
    container_width,
    () => toValue(decks).length + 1 // + the trailing "new deck" tile
  )

  /** Reposition `deck_id` relative to its neighbours, resolved from a drag drop index. */
  function reorderDeck(from: number, to: number) {
    const list = toValue(decks)
    const dragged = list[from]
    if (!dragged?.id) return

    const without = list.filter((_, i) => i !== from)
    const anchor = resolveReorderAnchor(without, to)
    if (!anchor) return

    move_deck_mutation
      .mutateAsync({ deck_id: dragged.id, ...anchor })
      .catch(() => notice.warn(t('toast.warn.reorder-failed')))
  }

  const reorder = useReorderDrag({
    count: () => toValue(decks).length,
    enabled: () => toValue(editing),
    onReorder: reorderDeck,
    geometry: {
      idealIndex: (from, dx, dy) => {
        const cols = columns.value
        const col = (from % cols) + dx / (cell_width.value + gap_x)
        const row = Math.floor(from / cols) + dy / row_pitch.value
        return row * cols + Math.min(cols - 1, Math.max(0, col))
      },
      position: itemPosition
    }
  })

  function dragTransform(index: number) {
    const offset = reorder.dragOffset(index)
    return `translate(${offset.x}px, ${offset.y}px)`
  }

  // Idle iOS-style jiggle: vary phase and tempo per card off its index so the
  // grid shimmers organically instead of beating in unison.
  function jiggleStyle(index: number) {
    return {
      '--jiggle-delay': `${-(index % 11) * 47}ms`,
      '--jiggle-duration': `${240 + (index % 5) * 16}ms`
    }
  }

  // The card lifted on pickup, held so the matching drop can settle it back —
  // the drop fires from a window pointerup, not a DOM event on the card.
  let lifted_card: HTMLElement | null = null

  // Pending touch press-and-hold: the timer, where the finger landed, and the
  // card + event it would pick up if the hold completes without moving away.
  let hold_timer = 0
  let hold_origin = { x: 0, y: 0 }
  let hold_index = -1
  let hold_event: PointerEvent | null = null

  function beginDrag(index: number, event: PointerEvent) {
    reorder.start(index, event)
    if (reorder.dragging_index.value === null) return

    lifted_card = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-testid="deck-grid__item"]'
    )
    if (lifted_card) liftListItem(lifted_card)
  }

  function cancelHold() {
    if (hold_timer) clearTimeout(hold_timer)
    hold_timer = 0
    hold_event = null
    hold_index = -1
    window.removeEventListener('pointermove', onHoldMove)
    window.removeEventListener('pointerup', cancelHold)
    window.removeEventListener('pointercancel', cancelHold)
  }

  function onHoldMove(event: PointerEvent) {
    const moved = Math.hypot(event.clientX - hold_origin.x, event.clientY - hold_origin.y)
    if (moved > HOLD_TOLERANCE) cancelHold()
  }

  function onHoldElapsed() {
    const index = hold_index
    const event = hold_event
    cancelHold()
    if (event) beginDrag(index, event)
  }

  function onItemPointerdown(index: number, event: PointerEvent) {
    if (!toValue(editing)) return

    if (event.pointerType === 'mouse') {
      beginDrag(index, event)
      return
    }

    hold_index = index
    hold_event = event
    hold_origin = { x: event.clientX, y: event.clientY }
    hold_timer = window.setTimeout(onHoldElapsed, HOLD_MS)
    window.addEventListener('pointermove', onHoldMove)
    window.addEventListener('pointerup', cancelHold)
    window.addEventListener('pointercancel', cancelHold)
  }

  let resize_observer: ResizeObserver | undefined

  onMounted(() => {
    if (!container_el.value) return
    container_width.value = container_el.value.clientWidth
    resize_observer = new ResizeObserver(([entry]) => {
      if (entry) container_width.value = entry.contentRect.width
    })
    resize_observer.observe(container_el.value)
  })

  onBeforeUnmount(() => {
    resize_observer?.disconnect()
    cancelHold()
  })

  // Settle the lifted card back to rest the moment the drag ends (the engine
  // clears dragging_index on the window pointerup).
  watch(
    () => reorder.dragging_index.value,
    (current, previous) => {
      if (current !== null || previous === null || !lifted_card) return
      dropListItem(lifted_card)
      lifted_card = null
    }
  )

  return {
    cell_width,
    measured,
    row_count,
    row_pitch,
    itemPosition,
    dragging_index: computed(() => reorder.dragging_index.value),
    shouldTransition: reorder.shouldTransition,
    dragTransform,
    jiggleStyle,
    onItemPointerdown
  }
}
