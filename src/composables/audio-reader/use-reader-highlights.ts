import { onBeforeUnmount, onMounted, ref, toValue, useTemplateRef, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { cleanTerm } from '@/utils/transcript'
import {
  moveReaderCursor,
  hideReaderCursor,
  type CursorBox
} from '@/utils/animations/reader-cursor'

// How far each highlight bleeds past the text on every side, so it reads as a
// padded pill rather than a tight box.
const PAD_X = 3
const PAD_Y = 2

// The interaction pill answers the pointer, so it glides faster than the
// audio-driven playhead (which keeps the slower, stretchy default).
const HOVER_DURATION = 0.12

// What a committed selection hands back: the bare term, the rect to anchor the
// popover against, and the first word's element so the caller can resolve which
// sentence it sits in (translator context).
type ReaderSelection = { term: string; rect: DOMRect; anchor: HTMLElement }

type WordRange = { lo: number; hi: number }

/**
 * Drive the floating highlight layers in the transcript reader: the audio-driven
 * **playhead** (stretchy, follows `active_word`) and the pointer-driven
 * **interaction** pill — which doubles as the hover indicator, the drag-to-select
 * highlight, and the standing selection while its popover is open.
 *
 * The pill is the selection: press a word and the pill anchors there; drag and
 * it stretches word by word to cover the range; release commits the term via
 * `onSelect` (a plain click is a zero-width range, so it selects one word). The
 * committed range stays lit — hover is held off — until `popover_open` flips
 * false. The translation gloss carries no `data-word-index`, so it can never join
 * a range; native text selection is left disabled by the host.
 *
 * "Which word" is JS state; the DOM is read only to measure "where is word N",
 * located by its stable `data-word-index`. Pills live inside `content` and are
 * positioned in its coordinate space, so they scroll with the column for free.
 *
 * Binds three template refs by name — the host must declare `ref="content"`,
 * `ref="playhead"`, and `ref="hover"`.
 *
 * @param active_word - index of the word the audio is on, or -1 for none.
 * @param onSelect - called on release with the committed range's term + rect.
 * @param popover_open - whether the term popover is showing; the selection holds
 *   while true and clears when it goes false.
 * @example
 * const { onPointerDown, onPointerMove, onPointerUp, onPointerLeave } =
 *   useReaderHighlights(() => active_word, commitSelection, () => popover_open)
 */
export function useReaderHighlights(
  active_word: MaybeRefOrGetter<number>,
  onSelect: (selection: ReaderSelection) => void,
  popover_open: MaybeRefOrGetter<boolean>
) {
  const content = useTemplateRef<HTMLElement>('content')
  const playhead = useTemplateRef<HTMLElement>('playhead')
  const hover = useTemplateRef<HTMLElement>('hover')

  // The word under the pointer (hover) or, while dragging, the focus end of the
  // range. `anchor_index` is the fixed end of a drag — null when not dragging.
  // `committed` is the released range, kept lit while its popover is open.
  const focus_index = ref<number | null>(null)
  const anchor_index = ref<number | null>(null)
  const committed = ref<WordRange | null>(null)

  let resize_observer: ResizeObserver | null = null

  onMounted(() => {
    resize_observer = new ResizeObserver(reposition)
    if (content.value) resize_observer.observe(content.value)
    window.addEventListener('click', swallowGestureClick, true)
  })

  onBeforeUnmount(() => {
    resize_observer?.disconnect()
    window.removeEventListener('click', swallowGestureClick, true)
  })

  // A pointer tap inside the reader is a word selection, not a click — yet the
  // browser still fires a compatibility `click` after `pointerup`. Swallow it in
  // the capture phase (before document-level handlers run) so an open popover's
  // outside-click dismiss never mistakes the selecting tap for a dismiss.
  function swallowGestureClick(event: MouseEvent) {
    if (content.value?.contains(event.target as Node)) event.stopPropagation()
  }

  /** Locate a word's element within the content by its stable index attribute. */
  function wordEl(index: number): HTMLElement | null {
    return content.value?.querySelector(`[data-word-index="${index}"]`) ?? null
  }

  /** The word index at viewport point (x, y), or null when none is there. */
  function wordIndexAt(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest('[data-word-index]')
    return el ? Number(el.getAttribute('data-word-index')) : null
  }

  /** A DOM range spanning whole words `lo`..`hi`, for measuring + reading text. */
  function wordRange({ lo, hi }: WordRange): Range | null {
    const first = wordEl(lo)
    const last = wordEl(hi)
    if (!first || !last) return null

    const range = document.createRange()
    range.setStartBefore(first)
    range.setEndAfter(last)
    return range
  }

  // Map a viewport rect onto the content's own coordinate space, where the
  // absolutely-positioned pills live, padded out into a pill shape.
  function boxOf(rect: DOMRect): CursorBox {
    const base = content.value!.getBoundingClientRect()
    return {
      left: rect.left - base.left - PAD_X,
      top: rect.top - base.top - PAD_Y,
      width: rect.width + PAD_X * 2,
      height: rect.height + PAD_Y * 2
    }
  }

  function rangeBox(range: WordRange): CursorBox | null {
    const dom = wordRange(range)
    return dom ? boxOf(dom.getBoundingClientRect()) : null
  }

  function wordBox(index: number): CursorBox | null {
    const el = wordEl(index)
    return el ? boxOf(el.getBoundingClientRect()) : null
  }

  function playheadBox(): CursorBox | null {
    const index = toValue(active_word)
    return index < 0 ? null : wordBox(index)
  }

  // Priority: an in-progress drag, then a committed selection (popover open),
  // then the plain hovered word.
  function interactionBox(): CursorBox | null {
    if (anchor_index.value !== null && focus_index.value !== null) {
      return rangeBox(orderedRange(anchor_index.value, focus_index.value))
    }
    if (committed.value) return rangeBox(committed.value)
    if (focus_index.value !== null) return wordBox(focus_index.value)
    return null
  }

  function positionPlayhead() {
    if (!playhead.value) return

    const box = playheadBox()
    if (!box) {
      hideReaderCursor(playhead.value)
      return
    }

    moveReaderCursor(playhead.value, box, { stretch: true })
    wordEl(toValue(active_word))?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  function positionInteraction() {
    if (!hover.value) return

    const box = interactionBox()
    if (!box) {
      hideReaderCursor(hover.value)
      return
    }

    moveReaderCursor(hover.value, box, { stretch: false, duration: HOVER_DURATION })
  }

  function reposition() {
    positionPlayhead()
    positionInteraction()
  }

  function orderedRange(a: number, b: number): WordRange {
    return { lo: Math.min(a, b), hi: Math.max(a, b) }
  }

  // Release commits the range as a term and lights it as the standing selection;
  // an empty (punctuation-only) range is dropped so the popover never opens.
  function commitSelection() {
    if (anchor_index.value === null || focus_index.value === null) return

    const range = orderedRange(anchor_index.value, focus_index.value)
    const dom = wordRange(range)
    const anchor = wordEl(range.lo)
    if (!dom || !anchor) return

    const term = cleanTerm(dom.toString())
    if (!term) return

    committed.value = range
    onSelect({ term, rect: dom.getBoundingClientRect(), anchor })
  }

  function onPointerDown(event: PointerEvent) {
    committed.value = null

    const index = wordIndexAt(event.clientX, event.clientY)
    if (index === null) return

    // Own the gesture: stop native text selection and keep receiving moves even
    // if the pointer strays outside the column mid-drag. Capture can reject a
    // non-active pointer (e.g. synthetic events in tests), so it's best-effort.
    event.preventDefault()
    try {
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    } catch {
      // no capture — the drag still tracks while the pointer stays over the column
    }

    anchor_index.value = index
    focus_index.value = index
  }

  function onPointerMove(event: PointerEvent) {
    const index = wordIndexAt(event.clientX, event.clientY)

    // Mid-drag, ignore gaps (translation gloss, padding) so the range holds its
    // last extent instead of collapsing.
    if (anchor_index.value !== null) {
      if (index !== null && index !== focus_index.value) focus_index.value = index
      return
    }

    // A committed selection owns the pill while its popover is open; don't let
    // hover steal it.
    if (committed.value) return

    if (index !== focus_index.value) focus_index.value = index
  }

  function onPointerUp() {
    if (anchor_index.value === null) return

    commitSelection()
    anchor_index.value = null
  }

  function onPointerLeave() {
    if (anchor_index.value !== null) return
    focus_index.value = null
  }

  // flush: 'post' so any layout settling lands before we measure word rects.
  watch(() => toValue(active_word), positionPlayhead, { flush: 'post' })
  watch([focus_index, anchor_index, committed], positionInteraction, { flush: 'post' })
  watch(
    () => toValue(popover_open),
    (open) => {
      if (!open) committed.value = null
    }
  )

  return { content, playhead, hover, onPointerDown, onPointerMove, onPointerUp, onPointerLeave }
}
