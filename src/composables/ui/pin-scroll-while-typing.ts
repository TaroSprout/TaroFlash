import { onMounted, onUnmounted, toValue, type MaybeRefOrGetter } from 'vue'

/**
 * Pins the document scroll position while the user types in a contenteditable
 * or text input inside `container`. →[K:pin-scroll-typing-reflow-sources]
 *
 * @param container - the editor/field root; read lazily so it can resolve late.
 */
export function usePinScrollWhileTyping(
  container: MaybeRefOrGetter<HTMLElement | null | undefined>
) {
  let anchor_y: number | null = null

  function inEditor(target: EventTarget | null): boolean {
    const root = toValue(container)
    if (!root || !(target instanceof HTMLElement)) return false
    const is_editable = target.isContentEditable || target instanceof HTMLInputElement
    return is_editable && root.contains(target)
  }

  // Fires before the DOM mutation, so the captured position is the pre-input one.
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
