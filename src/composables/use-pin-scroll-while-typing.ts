import { onMounted, onUnmounted, toValue, type MaybeRefOrGetter } from 'vue'

/**
 * Pins the document scroll position while the user types in a contenteditable
 * inside `container`.
 *
 * The card editor is a window-scrolled virtualized list. Typing in a card can
 * reflow it (the text region grows, the image region shrinks) without changing
 * the card's height — but the browser still fires a caret scroll-into-view on
 * each keypress, which reaches the document scroller and shifts the whole list.
 * This captures the scroll position at the first keystroke and restores it on
 * the input-driven scroll, so the list holds still. A deliberate wheel/touch
 * scroll releases the pin (the next keystroke re-anchors wherever the user
 * landed), and focus leaving the editor clears it.
 *
 * @param container - the editor list root; read lazily so it can resolve late.
 * @example
 * usePinScrollWhileTyping(() => list_el.value)
 */
export function usePinScrollWhileTyping(
  container: MaybeRefOrGetter<HTMLElement | null | undefined>
) {
  let anchor_y: number | null = null

  function inEditor(target: EventTarget | null): boolean {
    const root = toValue(container)
    if (!root || !(target instanceof HTMLElement)) return false
    return target.isContentEditable && root.contains(target)
  }

  // beforeinput fires before the DOM mutation and the resulting scroll, so the
  // captured position is the pre-input one. Keep the first keystroke's anchor
  // across a burst — re-capturing each keystroke would drift with the scroll.
  function onBeforeInput(e: Event) {
    if (anchor_y === null && inEditor(e.target)) anchor_y = window.scrollY
  }

  function onScroll() {
    if (anchor_y === null || window.scrollY === anchor_y) return
    window.scrollTo(window.scrollX, anchor_y)
  }

  function release() {
    anchor_y = null
  }

  onMounted(() => {
    document.addEventListener('beforeinput', onBeforeInput, true)
    document.addEventListener('focusout', release, true)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('wheel', release, { passive: true })
    window.addEventListener('touchmove', release, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('beforeinput', onBeforeInput, true)
    document.removeEventListener('focusout', release, true)
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('wheel', release)
    window.removeEventListener('touchmove', release)
  })
}
