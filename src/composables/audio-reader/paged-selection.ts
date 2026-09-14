import { onBeforeUnmount, onMounted, toValue, watch } from 'vue'
import type { MaybeRefOrGetter, ShallowRef } from 'vue'
import { cleanTerm, markTermInSentence, type SentenceWords } from '@/utils/transcript'

export type WordRange = { lo: number; hi: number }

// What a committed tap hands back — the same shape the scroll reader emits, so the
// lesson view's `openTerm` takes either without caring which layout produced it.
type PagedSelection = {
  term: string
  sentence: string
  rect: DOMRect
  word_index: number
  word_end_index: number
}

/**
 * Word selection + active-word painting for the paged reader.
 *
 * Simpler than the scroll reader's engine: every word on the visible page is
 * already mounted, so there's no virtualizer to reach through and no follow-scroll
 * to manage — the paged root advances pages instead. A tap selects one word, or
 * the whole matched phrase when it lands on a card the member already has; the
 * committed range stays lit while its popover is open. Long-press range-select is
 * not in this first cut.
 *
 * Painting (`data-playing` for the playhead, `data-active` for the selection) is
 * imperative — one attribute toggle per changed word — so Vue never re-renders the
 * page's words on a playhead tick.
 *
 * @param content - the visible pages host; word lookups scope to it.
 * @param active_word - index of the word the audio is on, or -1.
 * @param paragraphs - shaped paragraphs, for the tapped term's sentence context.
 * @param matchRangeAt - the card-match phrase covering a word, or null.
 * @param onSelect - called on commit with the selection.
 * @param onDismiss - called when a tap on empty space clears the selection.
 * @param popover_open - selection holds while true, clears when it goes false.
 */
export function usePagedSelection(
  content: Readonly<ShallowRef<HTMLElement | null>>,
  active_word: MaybeRefOrGetter<number>,
  paragraphs: MaybeRefOrGetter<SentenceWords[]>,
  matchRangeAt: (index: number) => WordRange | null,
  onSelect: (selection: PagedSelection) => void,
  onDismiss: () => void,
  popover_open: MaybeRefOrGetter<boolean>
) {
  let active_el: HTMLElement | null = null
  let painted_range: WordRange | null = null

  onMounted(paintActiveWord)

  onBeforeUnmount(() => {
    active_el = null
    painted_range = null
  })

  function wordEl(index: number): HTMLElement | null {
    return content.value?.querySelector(`[data-word-index="${index}"]`) ?? null
  }

  function wordBaseEl(index: number): HTMLElement | null {
    const el = wordEl(index)
    return el?.querySelector<HTMLElement>('[data-word-base]') ?? el
  }

  // Move `data-playing` from the previous playing word to the current one. The
  // element is absent when the playhead is on another page — harmless; it repaints
  // when that page mounts.
  function paintActiveWord() {
    const next = wordEl(toValue(active_word))
    if (next === active_el) return

    active_el?.removeAttribute('data-playing')
    next?.setAttribute('data-playing', 'true')
    active_el = next
  }

  function paintRange(range: WordRange | null) {
    if (painted_range) {
      for (let i = painted_range.lo; i <= painted_range.hi; i++) {
        wordEl(i)?.removeAttribute('data-active')
      }
    }

    painted_range = range
    if (!range) return

    for (let i = range.lo; i <= range.hi; i++) wordEl(i)?.setAttribute('data-active', 'true')
  }

  function wordIndexAt(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest('[data-word-index]')
    if (!el || !content.value?.contains(el)) return null
    return Number(el.getAttribute('data-word-index'))
  }

  function rangeText({ lo, hi }: WordRange): string {
    let text = ''
    for (let i = lo; i <= hi; i++) text += wordEl(i)?.dataset.wordText ?? ''
    return text
  }

  function unionRect(a: DOMRect, b: DOMRect): DOMRect {
    const left = Math.min(a.left, b.left)
    const top = Math.min(a.top, b.top)
    return new DOMRect(
      left,
      top,
      Math.max(a.right, b.right) - left,
      Math.max(a.bottom, b.bottom) - top
    )
  }

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

  function paragraphOf(word_index: number): SentenceWords | undefined {
    return toValue(paragraphs).find((p) => p.words.some((w) => w.index === word_index))
  }

  // Commit a word range as the standing selection: reconstruct the term from the
  // words (not the DOM text, which would fold in furigana), resolve its sentence
  // for translator context, and hand it up. A punctuation-only range is dropped.
  function commitRange(range: WordRange) {
    const rect = rangeRect(range)
    if (!rect) return

    const term = cleanTerm(rangeText(range))
    if (!term) return

    const paragraph = paragraphOf(range.lo)
    const raw_sentence = paragraph?.sentence || term
    const sentence = markTermInSentence(raw_sentence, paragraph?.words ?? [], range.lo, term)

    paintRange(range)
    onSelect({ term, sentence, rect, word_index: range.lo, word_end_index: range.hi })
  }

  /** A tap landed at (x, y): select the word (or its matched phrase), else dismiss. */
  function selectAtPoint(x: number, y: number) {
    const index = wordIndexAt(x, y)
    if (index === null) {
      paintRange(null)
      onDismiss()
      return
    }

    commitRange(matchRangeAt(index) ?? { lo: index, hi: index })
  }

  watch(() => toValue(active_word), paintActiveWord, { flush: 'post' })

  // Repaint after a page swap swaps the mounted words out from under the pointers.
  watch(
    () => toValue(popover_open),
    (open) => {
      if (!open) paintRange(null)
    }
  )

  return { selectAtPoint, paintActiveWord, paintRange }
}
