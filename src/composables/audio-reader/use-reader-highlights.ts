import { onBeforeUnmount, onMounted, ref, toValue, useTemplateRef, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { cleanTerm } from '@/utils/transcript'
import {
  moveReaderCursor,
  hideReaderCursor,
  type CursorBox
} from '@/utils/animations/reader-cursor'
import { scrollLineIntoView } from '@/utils/animations/transcript-scroll'

// How far each highlight bleeds past the text on every side, so it reads as a
// padded pill rather than a tight box.
const PAD_X = 3
const PAD_Y = 2

// The active-sentence backdrop bleeds further than the word pills so it reads as
// a padded block behind the whole line; it glides calmly rather than snapping.
const SENTENCE_PAD_X = 8
const SENTENCE_PAD_Y = 6
const SENTENCE_DURATION = 0.3

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
  const sentence = useTemplateRef<HTMLElement>('sentence')

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

  /**
   * The selected term, reconstructed from each word's `data-word-text` rather
   * than the DOM range's text — a range's `.toString()` would also pull in the
   * furigana `<rt>` annotations and corrupt the term.
   */
  function rangeText({ lo, hi }: WordRange): string {
    let text = ''
    for (let i = lo; i <= hi; i++) text += wordEl(i)?.dataset.wordText ?? ''
    return text
  }

  // The word's base-text element — the ruby minus its `<rt>` reading — so
  // measurements cover only the main text, not the furigana band above it.
  // Falls back to the word element itself when there's no base marker.
  function wordBaseEl(index: number): HTMLElement | null {
    const el = wordEl(index)
    return el?.querySelector<HTMLElement>('[data-word-base]') ?? el
  }

  function unionRect(a: DOMRect, b: DOMRect): DOMRect {
    const left = Math.min(a.left, b.left)
    const top = Math.min(a.top, b.top)
    const right = Math.max(a.right, b.right)
    const bottom = Math.max(a.bottom, b.bottom)
    return new DOMRect(left, top, right - left, bottom - top)
  }

  // Bounding rect of words `lo`..`hi` over their base text only. Each base rect
  // is unioned individually — a DOM range across the rubies would re-include the
  // intermediate `<rt>` annotations and inflate the box upward.
  function rangeRect({ lo, hi }: WordRange): DOMRect | null {
    let box: DOMRect | null = null
    for (let i = lo; i <= hi; i++) {
      const el = wordBaseEl(i)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      box = box ? unionRect(box, rect) : rect
    }
    return box
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
    const rect = rangeRect(range)
    return rect ? boxOf(rect) : null
  }

  function wordBox(index: number): CursorBox | null {
    const el = wordBaseEl(index)
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
  }

  /** The segment (sentence) element the active word sits in, or null for none. */
  function activeSegmentEl(): HTMLElement | null {
    const index = toValue(active_word)
    if (index < 0) return null
    return (wordEl(index)?.closest('[data-testid="transcript-segment"]') as HTMLElement) ?? null
  }

  function segmentBox(el: HTMLElement): CursorBox {
    const base = content.value!.getBoundingClientRect()
    const rect = el.getBoundingClientRect()
    return {
      left: rect.left - base.left - SENTENCE_PAD_X,
      top: rect.top - base.top - SENTENCE_PAD_Y,
      width: rect.width + SENTENCE_PAD_X * 2,
      height: rect.height + SENTENCE_PAD_Y * 2
    }
  }

  function positionSentence() {
    if (!sentence.value) return

    const seg = activeSegmentEl()
    if (!seg) {
      hideReaderCursor(sentence.value)
      return
    }

    moveReaderCursor(sentence.value, segmentBox(seg), {
      stretch: false,
      duration: SENTENCE_DURATION
    })
  }

  // The nearest scrollable ancestor — the reader column the transcript lives in.
  function scrollParentOf(el: HTMLElement | null): HTMLElement | null {
    let node = el?.parentElement ?? null
    while (node) {
      const overflow_y = getComputedStyle(node).overflowY
      if (overflow_y === 'auto' || overflow_y === 'scroll') return node
      node = node.parentElement
    }
    return null
  }

  // Follow the active line down the column, but only when the *sentence* changes
  // — re-scrolling on every word would jitter mid-sentence.
  let last_segment_index = -1
  function followActiveSentence() {
    const seg = activeSegmentEl()
    if (!seg) return

    const index = Number(seg.getAttribute('data-index'))
    if (index === last_segment_index) return
    last_segment_index = index

    const container = scrollParentOf(content.value)
    if (container) scrollLineIntoView(container, seg)
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
    positionSentence()
  }

  function orderedRange(a: number, b: number): WordRange {
    return { lo: Math.min(a, b), hi: Math.max(a, b) }
  }

  // Release commits the range as a term and lights it as the standing selection;
  // an empty (punctuation-only) range is dropped so the popover never opens.
  function commitSelection() {
    if (anchor_index.value === null || focus_index.value === null) return

    const range = orderedRange(anchor_index.value, focus_index.value)
    const rect = rangeRect(range)
    const anchor = wordEl(range.lo)
    if (!rect || !anchor) return

    const term = cleanTerm(rangeText(range))
    if (!term) return

    committed.value = range
    onSelect({ term, rect, anchor })
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
  watch(
    () => toValue(active_word),
    () => {
      positionPlayhead()
      positionSentence()
      followActiveSentence()
    },
    { flush: 'post' }
  )
  watch([focus_index, anchor_index, committed], positionInteraction, { flush: 'post' })
  watch(
    () => toValue(popover_open),
    (open) => {
      if (!open) committed.value = null
    }
  )

  return {
    content,
    playhead,
    hover,
    sentence,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave
  }
}
