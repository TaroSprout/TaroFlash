import { computed, onBeforeUnmount, onMounted, ref, toValue, useTemplateRef, watch } from 'vue'
import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue'
import { usePlayOnTap } from '@/composables/use-play-on-tap'
import { emitSfx } from '@/sfx/bus'
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

// How far a touch may drift between press and release and still count as a tap
// rather than a scroll. Past this the finger is panning the column, not picking
// a word.
const TAP_SLOP = 10

// A still press this long arms range-select: the column stops scrolling and the
// drag extends the selection word by word instead of panning. A touch shorter
// than this (or one that drifts first) stays a tap-or-scroll. Kept just under the
// ~500ms native long-press so it feels responsive without firing on a quick tap.
const LONG_PRESS_MS = 400

// On mobile the term sheet rises over roughly the bottom half of the viewport, so a
// word committed past this fraction of the screen risks being buried by it. Such a
// word is eased up into view before the sheet covers it.
const SHEET_COVER_RATIO = 0.5

// What a committed selection hands back: the bare term, the rect to anchor the
// popover against, the first word's element so the caller can resolve which
// sentence it sits in (translator context), and the range's first/last word
// indices so playback can seek there or play just the phrase.
type ReaderSelection = {
  term: string
  rect: DOMRect
  anchor: HTMLElement
  index: number
  end_index: number
}

export type WordRange = { lo: number; hi: number }

// The live selection range (drag, standing selection, or hover) shared down to the
// words so each can tint itself when it falls under the blue interaction pill.
export const readerSelectionKey = Symbol('readerSelection') as InjectionKey<
  ComputedRef<WordRange | null>
>

/**
 * Drive the floating highlight layers in the transcript reader: the audio-driven
 * **playhead** (stretchy, follows `active_word`) and the pointer-driven
 * **interaction** pill — which doubles as the hover indicator, the drag-to-select
 * highlight, and the standing selection while its popover is open.
 *
 * The pill is the selection: with a mouse, press a word and the pill anchors
 * there; drag and it stretches word by word to cover the range; release commits
 * the term via `onSelect` (a plain click is a zero-width range, so it selects one
 * word). A touch instead claims nothing on the way down — the column scrolls
 * freely under the finger — and selects the word on release, but only if the
 * finger stayed put; a touch that drifts past `TAP_SLOP` is a scroll and commits
 * nothing. Holding a word still for `LONG_PRESS_MS` arms range-select instead: the
 * column stops scrolling, the drag extends the range word by word, and release
 * commits it. The committed range stays lit — hover is held off — while its popover
 * is open; on touch it persists after the popover closes, so re-tapping inside it
 * reopens the same selection, tapping another word replaces it, and tapping empty
 * space clears it. The translation gloss carries no `data-word-index`,
 * so it can never join a range; native text selection is left disabled by the host.
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
 * const { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onPointerCancel } =
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

  // Pops the interaction pill on every commit: the yoyo scale/rotate bumps the pill
  // and `tap_active` drives its `data-playing`, which the texture overlay turns into
  // a quick sliding bgx sweep for the same window.
  const { playing: tap_active, interceptClick: playHighlightTap } = usePlayOnTap({
    yoyo: true,
    activeOn: 'always',
    duration: 0.1
  })

  // The word under the pointer (hover) or, while dragging, the focus end of the
  // range. `anchor_index` is the fixed end of a drag — null when not dragging.
  // `committed` is the released range, kept lit while its popover is open.
  const focus_index = ref<number | null>(null)
  const anchor_index = ref<number | null>(null)
  const committed = ref<WordRange | null>(null)

  // A touch in flight: where it landed and which word, held until release decides
  // tap-vs-scroll. Plain (non-reactive) state — it never drives a pill directly.
  // `touch_selecting` flips true once a long-press arms range-select; from there
  // the drag extends the range and the column no longer scrolls. The timer is the
  // pending arm, cleared the moment the finger drifts or lifts.
  let tap: { x: number; y: number; index: number | null } | null = null
  let touch_selecting = false
  let long_press_timer: ReturnType<typeof setTimeout> | null = null

  // A committed touch tap is trailed by a browser compatibility `click`. When the
  // tap opened the mobile term sheet, that click lands on the sheet backdrop (over
  // the tap point, outside `content`) and would dismiss it the same frame. Arm a
  // one-shot swallow on commit so the trailing click is eaten wherever it lands.
  let suppress_gesture_click = false

  let resize_observer: ResizeObserver | null = null

  onMounted(() => {
    resize_observer = new ResizeObserver(reposition)
    if (content.value) resize_observer.observe(content.value)
    content.value?.addEventListener('touchmove', blockScrollWhileSelecting, { passive: false })
    window.addEventListener('click', swallowGestureClick, true)
  })

  onBeforeUnmount(() => {
    resize_observer?.disconnect()
    content.value?.removeEventListener('touchmove', blockScrollWhileSelecting)
    window.removeEventListener('click', swallowGestureClick, true)
    cancelLongPress()
  })

  // Once a long-press has armed range-select the finger is extending the range,
  // not panning — so swallow the native scroll. Touch scrolling can only be killed
  // from a non-passive `touchmove`; a pointer-event `preventDefault` won't do it,
  // which is why this is a native listener rather than the Vue `@pointermove`.
  function blockScrollWhileSelecting(event: TouchEvent) {
    if (touch_selecting) event.preventDefault()
  }

  // A pointer tap inside the reader is a word selection, not a click — yet the
  // browser still fires a compatibility `click` after `pointerup`. Swallow it in
  // the capture phase (before document-level handlers run) so a just-opened term
  // surface's outside-click dismiss never mistakes the selecting tap for a dismiss.
  // A committed touch arms `suppress_gesture_click` so its trailing click is eaten
  // even when it lands on the mobile sheet backdrop, which sits outside `content`.
  function swallowGestureClick(event: MouseEvent) {
    if (suppress_gesture_click) {
      suppress_gesture_click = false
      event.stopPropagation()
      return
    }
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

  // The nearest ancestor that actually scrolls — the reader column on desktop.
  // On mobile the column isn't bounded so nothing overflows; fall back to the
  // window, which is the real scroller there. Requiring real overflow (not just
  // an `overflow-y: auto` style) is what makes that fallback kick in.
  function scrollParentOf(el: HTMLElement | null): HTMLElement | Window {
    let node = el?.parentElement ?? null
    while (node) {
      const overflow_y = getComputedStyle(node).overflowY
      const scrollable = overflow_y === 'auto' || overflow_y === 'scroll'
      if (scrollable && node.scrollHeight > node.clientHeight) return node
      node = node.parentElement
    }
    return window
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

    scrollLineIntoView(scrollParentOf(content.value), seg)
  }

  // Keep a just-committed word clear of the term sheet. Only on mobile — where the
  // page itself scrolls and the sheet rises from the bottom — and only when the
  // word sits low enough to be covered; otherwise leave the view put. Desktop
  // scrolls the bounded column and anchors a popover that flips clear on its own.
  function revealCommitted(range: WordRange) {
    const scroller = scrollParentOf(content.value)
    if (scroller !== window) return

    const el = wordEl(range.lo)
    if (!el) return
    if (el.getBoundingClientRect().bottom <= window.innerHeight * SHEET_COVER_RATIO) return

    scrollLineIntoView(window, el)
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

  // Light a word range as the standing selection and hand it to the host; an empty
  // (punctuation-only) range is dropped so the popover never opens on nothing.
  function commitRange(range: WordRange) {
    const rect = rangeRect(range)
    const anchor = wordEl(range.lo)
    if (!rect || !anchor) return

    const term = cleanTerm(rangeText(range))
    if (!term) return

    committed.value = range
    onSelect({ term, rect, anchor, index: range.lo, end_index: range.hi })
    pulseHighlight()
    revealCommitted(range)
  }

  // Fire the tap flag on the pill. usePlayOnTap reads its target from
  // `currentTarget`, so hand it a minimal event pointing at the (pointer-inert)
  // pill — there's no real DOM click to forward here.
  function pulseHighlight() {
    if (!hover.value) return
    playHighlightTap({
      currentTarget: hover.value,
      preventDefault() {},
      stopImmediatePropagation() {}
    } as unknown as MouseEvent)
  }

  // Release commits the in-progress drag as the standing selection.
  function commitDrag() {
    if (anchor_index.value === null || focus_index.value === null) return
    commitRange(orderedRange(anchor_index.value, focus_index.value))
  }

  /** Whether `index` falls inside the current standing selection. */
  function committedContains(index: number): boolean {
    const range = committed.value
    return range !== null && index >= range.lo && index <= range.hi
  }

  // The range under the blue interaction pill, by the same priority the pill uses:
  // an in-progress drag, then the standing selection, then the plain hovered word.
  // Words read this (via provide/inject) to tint their text against the pill.
  const interaction_range = computed<WordRange | null>(() => {
    if (anchor_index.value !== null && focus_index.value !== null) {
      return orderedRange(anchor_index.value, focus_index.value)
    }
    if (committed.value) return committed.value
    if (focus_index.value !== null) return { lo: focus_index.value, hi: focus_index.value }
    return null
  })

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch') {
      beginTap(event)
      return
    }

    beginDrag(event)
  }

  // A touch defers to release or to a long-press: remember where it landed and
  // which word (null when it missed every word), and start the arm timer. Until it
  // fires the gesture stays the browser's, so the column scrolls; a drift past the
  // slop cancels it (trackTap). An empty-space press is still recorded so release
  // can tell a stationary tap-to-deselect from a scroll, but it can't arm a range.
  function beginTap(event: PointerEvent) {
    const index = wordIndexAt(event.clientX, event.clientY)
    tap = { x: event.clientX, y: event.clientY, index }
    if (index !== null) long_press_timer = setTimeout(armTouchSelection, LONG_PRESS_MS)
  }

  function cancelLongPress() {
    if (long_press_timer === null) return
    clearTimeout(long_press_timer)
    long_press_timer = null
  }

  // The long-press fired with the finger still on its word: arm range-select. The
  // pill lights on the anchor word and the drag now extends it; a haptic tick plus
  // a `tap_05` tick confirm the first word joined (vibrate is a no-op where the API
  // is absent, e.g. iOS Safari).
  function armTouchSelection() {
    long_press_timer = null
    if (!tap || tap.index === null) return

    touch_selecting = true
    anchor_index.value = tap.index
    focus_index.value = tap.index
    navigator.vibrate?.(10)
    emitSfx('ui.tap_05')
  }

  function beginDrag(event: PointerEvent) {
    const index = wordIndexAt(event.clientX, event.clientY)
    if (index === null) return

    committed.value = null

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
    if (event.pointerType === 'touch') {
      trackTap(event)
      return
    }

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

  // Pre-arm, a touch that travels past the slop is a scroll, not a tap — forget it
  // (and the pending arm) so release selects nothing. Once armed, the same travel
  // extends the range instead.
  function trackTap(event: PointerEvent) {
    if (touch_selecting) {
      extendTouchSelection(event)
      return
    }
    if (!tap) return
    if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > TAP_SLOP) {
      cancelLongPress()
      tap = null
    }
  }

  // While armed, follow the finger word by word, holding the last extent over gaps
  // (translation gloss, padding) so the range doesn't collapse between words. Each
  // new word ticks `tap_05`, so the range audibly ratchets as words join or leave.
  function extendTouchSelection(event: PointerEvent) {
    const index = wordIndexAt(event.clientX, event.clientY)
    if (index === null || index === focus_index.value) return

    focus_index.value = index
    emitSfx('ui.tap_05')
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerType === 'touch') {
      commitTouch()
      return
    }

    if (anchor_index.value === null) return

    commitDrag()
    anchor_index.value = null
  }

  // Release ends the touch gesture. An armed long-press drag commits its current
  // extent as a fresh range. A stationary tap on a word either reopens the standing
  // selection it lands inside (the whole phrase, untouched) or starts a fresh
  // single-word one. A stationary tap on empty space is a click outside the
  // selection, so it clears it. A scroll (drift past the slop nulls `tap`) commits
  // nothing and leaves the selection lit, so scrolling never deselects. The range
  // refs then clear so the committed pill — not a lingering hover — is what stays lit.
  function commitTouch() {
    cancelLongPress()

    if (touch_selecting && anchor_index.value !== null && focus_index.value !== null) {
      commitRange(orderedRange(anchor_index.value, focus_index.value))
      suppress_gesture_click = true
    } else if (tap && tap.index !== null) {
      const range = committedContains(tap.index)
        ? committed.value!
        : { lo: tap.index, hi: tap.index }
      commitRange(range)
      suppress_gesture_click = true
    } else if (tap) {
      committed.value = null
    }

    anchor_index.value = null
    focus_index.value = null
    touch_selecting = false
    tap = null
  }

  // A scroll the browser claims (or any aborted touch) fires pointercancel: drop
  // the pending tap and disarm so nothing commits on the absent release.
  function onPointerCancel() {
    cancelLongPress()
    anchor_index.value = null
    focus_index.value = null
    touch_selecting = false
    tap = null
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
    tap_active,
    interaction_range,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onPointerCancel
  }
}
