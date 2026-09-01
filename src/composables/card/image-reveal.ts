import { nextTick, ref, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue'
import { revealFaceImage } from '@/utils/animations/face-image'

/**
 * Gate a face/cover image behind load: `decoded` stays false (caller shows a
 * skeleton) until the `<img>` has loaded, then fades it in via revealFaceImage.
 * Re-runs on every `source` change, including the element being reinserted after
 * a flip. Bind the returned `onLoad` to the `<img>`'s `@load` — a reinserted
 * element can reject `decode()` mid-flip and isn't `complete` on the first tick,
 * so the load event is the reliable reveal signal; decode is only a fast path.
 *
 * @param source - getter for the image src; falsy clears `decoded`.
 * @param img - template ref to the `<img>` being revealed.
 */
export function useImageReveal(
  source: MaybeRefOrGetter<string | undefined>,
  img: Readonly<ShallowRef<HTMLImageElement | null>>
) {
  const decoded = ref(false)

  async function reveal() {
    const el = img.value
    if (!el || decoded.value) return
    decoded.value = true
    await nextTick()
    if (img.value) revealFaceImage(img.value)
  }

  async function decodeThenReveal() {
    await nextTick()

    const el = img.value
    if (!el) return
    if (isLoaded(el)) return reveal()

    try {
      await el.decode()
      await reveal()
    } catch {
      // decode() rejects on an element reinserted mid-flip; @load is the fallback.
      if (isLoaded(el)) reveal()
    }
  }

  watch(
    () => toValue(source),
    (path) => {
      decoded.value = false
      if (path) decodeThenReveal()
    },
    { immediate: true }
  )

  return { decoded, onLoad: reveal }
}

function isLoaded(el: HTMLImageElement) {
  return el.complete && el.naturalWidth > 0
}
