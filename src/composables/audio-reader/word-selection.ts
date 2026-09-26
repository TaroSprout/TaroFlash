import { computed, nextTick, onBeforeUnmount, onMounted, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
import { useStagedTap } from '@/composables/ui/staged-tap'
import { emitSfx } from '@/sfx/bus'
import { cleanTerm, markTermInSentence, type SentenceWords } from '@/utils/transcript'
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

// The interaction pill answers the pointer, so it glides quickly.
const HOVER_DURATION = 0.12

// How far a touch may drift between press and release and still count as a tap
// rather than a scroll/page-turn. Past this the finger is panning, not picking
// a word.
const TAP_SLOP = 10

// A still press this long arms range-select: the host stops scrolling and the
// drag extends the selection word by word instead of panning. A touch shorter
// than this (or one that drifts first) stays a tap-or-scroll. Kept just under the
// ~500ms native long-press so it feels responsive without firing on a quick tap.
const LONG_PRESS_MS = 400

// On mobile the term sheet rises over roughly the bottom half of the viewport, so a
// word committed past this fraction of the screen risks being buried by it. Such a
// word is eased up into view before the sheet covers it.
const SHEET_COVER_RATIO = 0.5

export type WordRange = { lo: number; hi: number }

// Minimal shape of a virtualizer this engine needs — just enough to scroll an
// unmounted row/page into view before locating its word. Optional: a host whose
// words are already all mounted (a single visible page) has no need for one.
type WordVirtualizer = Ref<{
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => void
}>

export type WordSelectionOptions = {
  content: Readonly<ShallowRef<HTMLElement | null>>
  active_word: MaybeRefOrGetter<number>
  paragraphs: MaybeRefOrGetter<SentenceWords[]>
  onSelect: (selection: TermSelection) => void
  onDismiss: () => void
  popover_open: MaybeRefOrGetter<boolean>
  matchRangeAt?: (index: number) => WordRange | null
  virtualizer?: WordVirtualizer
  rowIndexOfWord?: (word_index: number) => number
  // Called whenever a manual gesture (a touch that turned out to be a scroll,
  // an aborted touch) took over from a pending selection — a host tracking its
  // own auto-follow-scroll uses this to let go, the same way a wheel event does.
  onManualScroll?: () => void
}

/**
 * The one word-painting and selection engine every reader layout shares:
 * marks the playing word as audio advances, and turns a tap, a drag, or a
 * held-then-dragged touch into a committed word range, raising its
 * translation. Painting (`data-playing` for the playhead, `data-active` for
 * the selection) is imperative — one attribute toggle per changed word — so
 * Vue never re-renders the host's (possibly thousands of) word elements on a
 * playhead tick or a selection change.
 *
 * The pointer-driven **interaction** pill doubles as the hover indicator, the
 * drag-to-select highlight, and the standing selection while its popover is
 * open. With a mouse, press a word and the pill anchors there; drag and it
 * stretches word by word to cover the range; release commits the term (a
 * plain click is a zero-width range, so it selects one word). A touch instead
 * claims nothing on the way down — the host scrolls freely under the finger —
 * and selects the word on release, but only if the finger stayed put; a touch
 * that drifts past `TAP_SLOP` is a scroll/page-turn and commits nothing.
 * Holding a word still for `LONG_PRESS_MS` arms range-select instead: the
 * host stops scrolling (a non-passive `touchmove` listener on `content`
 * swallows it), the drag extends the range word by word, and release commits
 * it. The committed range stays lit while its popover is open; on touch it
 * persists after the popover closes, so re-tapping inside it reopens the same
 * selection, tapping another word replaces it, and tapping empty space clears
 * it.
 *
 * "Which word" is JS state; the DOM is read only to measure "where is word N",
 * located by its stable `data-word-index`. Pills live inside `content` and are
 * positioned in its coordinate space, so they scroll/page with it for free.
 *
 * Tapping any word inside a saved-card phrase (`matchRangeAt`) selects the
 * whole matched phrase; a drag (or long-press range select) still commits
 * exactly what was swept. A committed range covering only punctuation is
 * dropped — the popover never opens on nothing.
 *
 * @param options.content - the words host; word lookups and pill positioning scope to it.
 * @param options.active_word - index of the word the audio is on, or -1 for none.
 * @param options.paragraphs - shaped paragraphs, for a committed term's sentence context.
 * @param options.onSelect - called on commit with the selection's term + rect + range.
 * @param options.popover_open - the selection holds while true, clears when it goes false.
 * @param options.onDismiss - called when a tap on empty space clears the selection.
 * @param options.matchRangeAt - resolves the card-match range covering a word, or null.
 * @param options.virtualizer - a window/word virtualizer, used to bring an
 *   unmounted active word's row into the DOM. Omit when every word is already
 *   mounted (e.g. a single visible page).
 * @param options.rowIndexOfWord - resolves a word index to its virtualizer row index.
 * @example
 * const { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onPointerCancel } =
 *   useWordSelection({ content, active_word, paragraphs, onSelect, popover_open, onDismiss })
 */
export function useWordSelection(options: WordSelectionOptions) {
  const {
    content,
    active_word,
    paragraphs,
    onSelect,
    onDismiss,
    popover_open,
    matchRangeAt = () => null,
    virtualizer,
    rowIndexOfWord,
    onManualScroll
  } = options

  // One pill element per visual line of the active selection. The template
  // renders this many pill divs and hands their refs back via setHoverEl.
  const hover_lines = ref<CursorBox[]>([])
  const hover_el_pool = new Map<number, HTMLElement>()

  /** Called by the template's `:ref` callback for each rendered pill. */
  function setHoverEl(el: HTMLElement | null, i: number) {
    if (el) hover_el_pool.set(i, el)
    else hover_el_pool.delete(i)
  }

  // Pops the interaction pill on every commit: the yoyo scale/rotate bumps the pill
  // and `tap_active` drives its `data-playing`, which the texture overlay turns into
  // a quick sliding bgx sweep for the same window.
  const { playing: tap_active, tap: _tapHighlight } = useStagedTap({
    animate: 'pop',
    yoyo: true,
    activeOn: 'always',
    duration: 0.1
  })
  const playHighlightTap = _tapHighlight()

  // The word under the pointer (hover) or, while dragging, the focus end of the
  // range. `anchor_index` is the fixed end of a drag — null when not dragging.
  // `committed` is the released range, kept lit while its popover is open.
  const focus_index = ref<number | null>(null)
  const anchor_index = ref<number | null>(null)
  const committed = ref<WordRange | null>(null)

  // While an armed touch drag is extending the range, the finger's live viewport
  // position — drives the preview bubble that trails the finger. Null whenever no
  // armed touch selection is in flight, so the bubble shows on coarse pointers only.
  const touch_point = ref<{ x: number; y: number } | null>(null)

  // A touch in flight: where it landed and which word, held until release decides
  // tap-vs-scroll. Plain (non-reactive) state — it never drives a pill directly.
  // `touch_selecting` flips true once a long-press arms range-select; from there
  // the drag extends the range and the host no longer scrolls. The timer is the
  // pending arm, cleared the moment the finger drifts or lifts.
  let tap: { x: number; y: number; index: number | null } | null = null
  let touch_selecting = false
  let long_press_timer: ReturnType<typeof setTimeout> | null = null

  // A committed touch tap is trailed by a browser compatibility `click`. That click
  // can land on the just-opened term surface (over the tap point) and act on it the
  // same frame. Arm a one-shot swallow on commit so the trailing click is eaten
  // wherever it lands. The trailing click sometimes never fires — a scroll (or the
  // surface swapping the element under the finger) makes the browser cancel it —
  // so a fresh `pointerdown` also disarms the flag, or it would stay armed and eat
  // the next genuine tap (the first action tap).
  let suppress_gesture_click = false

  let resize_observer: ResizeObserver | null = null

  // The word element currently flagged as playing. The active-word cue is painted
  // imperatively — one attribute toggle on the outgoing and incoming word — rather
  // than having all (thousands of) word elements subscribe to `active_word` and
  // re-render together on every playhead tick.
  let active_el: HTMLElement | null = null

  // The current selection range painted onto word elements. Managed imperatively
  // like `active_el` so Vue never re-renders word elements when the range
  // changes — painting `data-active` via setAttribute avoids scheduling re-renders
  // for every word in the transcript (can be hundreds) on each tap.
  let painted_range: WordRange | null = null

  onMounted(() => {
    paintActiveWord()
    resize_observer = new ResizeObserver(reposition)
    if (content.value) resize_observer.observe(content.value)
    content.value?.addEventListener('touchmove', blockScrollWhileSelecting, { passive: false })
    window.addEventListener('click', swallowGestureClick, true)
    window.addEventListener('pointerdown', disarmGestureClick, true)
  })

  onBeforeUnmount(() => {
    resize_observer?.disconnect()
    content.value?.removeEventListener('touchmove', blockScrollWhileSelecting)
    window.removeEventListener('click', swallowGestureClick, true)
    window.removeEventListener('pointerdown', disarmGestureClick, true)
    cancelLongPress()
  })

  // Once a long-press has armed range-select the finger is extending the range,
  // not scrolling/page-turning — so swallow the native scroll. Touch scrolling can
  // only be killed from a non-passive `touchmove`; a pointer-event `preventDefault`
  // won't do it, which is why this is a native listener rather than `@pointermove`.
  function blockScrollWhileSelecting(event: TouchEvent) {
    if (touch_selecting) event.preventDefault()
  }

  // A pointer tap inside the host is a word selection, not a click — yet the
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

  // A fresh press starts a new gesture, so any trailing click still owed by the
  // previous tap is moot — drop the armed swallow before it can eat this gesture's
  // click. (The selecting tap's own pointerdown runs before the flag is armed, so
  // this is a harmless no-op there.)
  function disarmGestureClick() {
    suppress_gesture_click = false
  }

  /** Locate a word's element within the content by its stable index attribute. */
  function wordEl(index: number): HTMLElement | null {
    return content.value?.querySelector(`[data-word-index="${index}"]`) ?? null
  }

  // The active word is audio-driven and can legitimately sit outside the
  // currently mounted range (after a seek, a scrub, or a resumed lesson). Every
  // other word lookup in this file targets a word the member is currently
  // touching on screen, so it's already mounted and doesn't need this.
  async function ensureWordMounted(index: number): Promise<HTMLElement | null> {
    const existing = wordEl(index)
    if (existing) return existing
    if (!virtualizer || !rowIndexOfWord) return null

    const row_index = rowIndexOfWord(index)
    virtualizer.value.scrollToIndex(row_index, { align: 'center' })
    await nextTick()
    return wordEl(index)
  }

  // Move the `data-playing` flag from the previous active word to the current one
  // (CSS keys the blue tint + scale off it). A no-op when neither moved.
  async function paintActiveWord() {
    const next = await ensureWordMounted(toValue(active_word))
    if (next === active_el) return

    active_el?.removeAttribute('data-playing')
    next?.setAttribute('data-playing', 'true')
    active_el = next
  }

  // Apply data-active to the words in `range`, clearing the previous range first.
  // Same imperative strategy as paintActiveWord — no Vue reactivity involved.
  function paintWords(range: WordRange | null) {
    if (painted_range) {
      for (let i = painted_range.lo; i <= painted_range.hi; i++) {
        wordEl(i)?.removeAttribute('data-active')
      }
    }
    painted_range = range
    if (range) {
      for (let i = range.lo; i <= range.hi; i++) {
        wordEl(i)?.setAttribute('data-active', 'true')
      }
    }
  }

  /** The word index at viewport point (x, y), or null when none is there. */
  function wordIndexAt(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest('[data-word-index]')
    if (!el || !content.value?.contains(el)) return null

    const raw_index = el.getAttribute('data-word-index')
    return Number(raw_index)
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

  // Group selected words into per-visual-line boxes. Words within LINE_SNAP px
  // of each other vertically land in the same bucket; each bucket becomes one pill.
  const LINE_SNAP = 4

  function rangeLines(range: WordRange): CursorBox[] {
    if (!content.value) return []
    const base = content.value.getBoundingClientRect()
    type Bucket = { top: number; bottom: number; left: number; right: number }
    const buckets = new Map<number, Bucket>()

    for (let i = range.lo; i <= range.hi; i++) {
      const el = wordBaseEl(i)
      if (!el) continue
      const r = el.getBoundingClientRect()
      const key = Math.round(r.top / LINE_SNAP) * LINE_SNAP
      const b = buckets.get(key)
      if (b) {
        b.left = Math.min(b.left, r.left)
        b.right = Math.max(b.right, r.right)
        b.top = Math.min(b.top, r.top)
        b.bottom = Math.max(b.bottom, r.bottom)
      } else {
        buckets.set(key, { top: r.top, bottom: r.bottom, left: r.left, right: r.right })
      }
    }

    return [...buckets.values()]
      .sort((a, b) => a.top - b.top)
      .map((b) => ({
        left: b.left - base.left - PAD_X,
        top: b.top - base.top - PAD_Y,
        width: b.right - b.left + PAD_X * 2,
        height: b.bottom - b.top + PAD_Y * 2
      }))
  }

  // Priority: drag > committed selection > hover. A single hovered word is one
  // line; a range or committed selection may span multiple.
  function interactionLines(): CursorBox[] {
    if (anchor_index.value !== null && focus_index.value !== null) {
      const range = orderedRange(anchor_index.value, focus_index.value)
      return rangeLines(range)
    }
    if (committed.value) return rangeLines(committed.value)
    if (focus_index.value !== null) {
      const el = wordBaseEl(focus_index.value)
      const rect = el?.getBoundingClientRect()
      return rect ? [boxOf(rect)] : []
    }
    return []
  }

  function paragraphOf(word_index: number): SentenceWords | undefined {
    return toValue(paragraphs).find((p) => p.words.some((w) => w.index === word_index))
  }

  // Reconstruct a committed range into the shape `openTerm` expects: the term
  // (not the DOM text, which would fold in furigana), its sentence for
  // translator context, and the rect to anchor the popover against. Null for a
  // punctuation-only range, so the popover never opens on nothing.
  function buildSelection(range: WordRange): TermSelection | null {
    const rect = rangeRect(range)
    if (!rect) return null

    const raw_text = rangeText(range)
    const term = cleanTerm(raw_text)
    if (!term) return null

    const paragraph = paragraphOf(range.lo)
    const raw_sentence = paragraph?.sentence || term
    const sentence = markTermInSentence(raw_sentence, paragraph?.words ?? [], range.lo, term)

    return { term, sentence, rect, word_index: range.lo, word_end_index: range.hi }
  }

  // Keep a just-committed word clear of the term sheet, on mobile where the
  // page scrolls and the sheet rises from the bottom, and only when the word
  // sits low enough to be covered; otherwise leave the view put.
  function revealCommitted(range: WordRange) {
    const el = wordEl(range.lo)
    if (!el) return
    if (el.getBoundingClientRect().bottom <= window.innerHeight * SHEET_COVER_RATIO) return

    scrollLineIntoView(el)
  }

  async function positionInteraction() {
    const lines = interactionLines()

    // Hide before Vue unmounts, or the fade has no element left to run on.
    hover_el_pool.forEach((el, i) => {
      if (i >= lines.length) hideReaderCursor(el)
    })

    hover_lines.value = lines
    if (lines.length === 0) return

    await nextTick()

    lines.forEach((box, i) => {
      const el = hover_el_pool.get(i)
      if (el) moveReaderCursor(el, box, { duration: HOVER_DURATION })
    })
  }

  function reposition() {
    positionInteraction()
  }

  function orderedRange(a: number, b: number): WordRange {
    return { lo: Math.min(a, b), hi: Math.max(a, b) }
  }

  // Light a word range as the standing selection and hand it to the host.
  function commitRange(range: WordRange) {
    const selection = buildSelection(range)
    if (!selection) return

    committed.value = range
    onSelect(selection)
    pulseHighlight()
    revealCommitted(range)
  }

  // Fire the tap animation on the pill by passing a minimal synthetic event
  // pointing at it — there's no real DOM click to forward here.
  function pulseHighlight() {
    const el = hover_el_pool.get(0)
    if (!el) return
    playHighlightTap({
      currentTarget: el,
      preventDefault() {},
      stopImmediatePropagation() {}
    } as unknown as MouseEvent)
  }

  // Release commits the in-progress drag as the standing selection. A click
  // (anchor === focus) on a matched word selects the whole matched phrase; a real
  // drag commits exactly what the pointer swept, even across a match.
  function commitDrag() {
    if (anchor_index.value === null || focus_index.value === null) return

    const range =
      anchor_index.value === focus_index.value
        ? (matchRangeAt(anchor_index.value) ?? { lo: anchor_index.value, hi: anchor_index.value })
        : orderedRange(anchor_index.value, focus_index.value)

    commitRange(range)
  }

  /** Whether `index` falls inside the current standing selection. */
  function committedContains(index: number): boolean {
    const range = committed.value
    return range !== null && index >= range.lo && index <= range.hi
  }

  // The live preview shown over an armed touch drag: the selected text, the
  // finger's x (the bubble tracks it horizontally), and the focus word's line rect
  // (so the bubble rides above that line, fixed vertically rather than bobbing with
  // the finger). Null whenever no touch selection is dragging, so the host renders
  // the bubble on touch only.
  const selection_preview = computed(() => {
    if (!touch_point.value || anchor_index.value === null || focus_index.value === null) return null

    const range = orderedRange(anchor_index.value, focus_index.value)
    const text = rangeText(range)
    if (!text) return null

    const rect = wordBaseEl(focus_index.value)?.getBoundingClientRect()
    if (!rect) return null

    return { text, x: touch_point.value.x, top: rect.top, bottom: rect.bottom }
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
  // fires the gesture stays the host's own scroll/page-turn; a drift past the slop
  // cancels it (trackTap). An empty-space press is still recorded so release can
  // tell a stationary tap-to-deselect from a scroll, but it can't arm a range.
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
    touch_point.value = { x: tap.x, y: tap.y }
    navigator.vibrate?.(10)
    emitSfx('gesture.tick')
  }

  function beginDrag(event: PointerEvent) {
    const index = wordIndexAt(event.clientX, event.clientY)
    if (index === null) return

    committed.value = null

    // Capture is best-effort: it rejects a non-active pointer, as synthetic test events are.
    event.preventDefault()
    try {
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    } catch {
      // no capture — the drag still tracks while the pointer stays over the host
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

    // Ignore gaps mid-drag, or the range collapses instead of holding its last extent.
    if (anchor_index.value !== null) {
      if (index !== null && index !== focus_index.value) {
        focus_index.value = index
        emitSfx('gesture.tick')
      }
      return
    }

    // A committed selection owns the pill while its popover is open.
    if (committed.value) return

    if (index !== focus_index.value) focus_index.value = index
  }

  // Pre-arm, a touch that travels past the slop is a scroll/page-turn, not a
  // tap — forget it (and the pending arm) so release selects nothing. Once
  // armed, the same travel extends the range instead.
  function trackTap(event: PointerEvent) {
    if (touch_selecting) {
      extendTouchSelection(event)
      return
    }
    if (!tap) return
    if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > TAP_SLOP) {
      cancelLongPress()
      tap = null
      onManualScroll?.()
    }
  }

  // While armed, follow the finger word by word, holding the last extent over gaps
  // (translation gloss, padding) so the range doesn't collapse between words. Each
  // new word ticks `tap_05`, so the range audibly ratchets as words join or leave.
  function extendTouchSelection(event: PointerEvent) {
    // Update every move, not every word, or the preview bubble stutters.
    touch_point.value = { x: event.clientX, y: event.clientY }

    const index = wordIndexAt(event.clientX, event.clientY)
    if (index === null || index === focus_index.value) return

    focus_index.value = index
    emitSfx('gesture.tick')
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
  // selection, so it clears it. A scroll/page-turn (drift past the slop nulls
  // `tap`) commits nothing and leaves the selection lit. The range refs then clear
  // so the committed pill — not a lingering hover — is what stays lit.
  function commitTouch() {
    cancelLongPress()

    if (touch_selecting && anchor_index.value !== null && focus_index.value !== null) {
      const range = orderedRange(anchor_index.value, focus_index.value)
      commitRange(range)
      suppress_gesture_click = true
    } else if (tap && tap.index !== null) {
      const range = committedContains(tap.index)
        ? committed.value!
        : (matchRangeAt(tap.index) ?? { lo: tap.index, hi: tap.index })
      commitRange(range)
      suppress_gesture_click = true
    } else if (tap) {
      committed.value = null
      onDismiss()
    }

    anchor_index.value = null
    focus_index.value = null
    touch_selecting = false
    touch_point.value = null
    tap = null
  }

  // A scroll/page-turn the host claims (or any aborted touch) fires pointercancel:
  // drop the pending tap and disarm so nothing commits on the absent release.
  function onPointerCancel() {
    // A cancel is the host taking the touch for a scroll, unless range-select armed it.
    if (!touch_selecting) onManualScroll?.()

    cancelLongPress()
    anchor_index.value = null
    focus_index.value = null
    touch_selecting = false
    touch_point.value = null
    tap = null
  }

  function onPointerLeave() {
    if (anchor_index.value !== null) return
    focus_index.value = null
  }

  // flush: 'post' so any layout settling lands before we measure the word rect.
  watch(() => toValue(active_word), paintActiveWord, { flush: 'post' })
  watch(
    [focus_index, anchor_index, committed],
    () => {
      const range =
        anchor_index.value !== null && focus_index.value !== null
          ? orderedRange(anchor_index.value, focus_index.value)
          : (committed.value ??
            (focus_index.value !== null ? { lo: focus_index.value, hi: focus_index.value } : null))
      paintWords(range)
      positionInteraction()
    },
    { flush: 'post' }
  )
  watch(
    () => toValue(popover_open),
    (open) => {
      if (!open) {
        committed.value = null
        paintWords(null)
      }
    }
  )

  return {
    hover_lines,
    setHoverEl,
    tap_active,
    selection_preview,
    paintActiveWord,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onPointerCancel
  }
}
