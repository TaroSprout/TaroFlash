import { nextTick, ref, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue'
import { revealFaceImage } from '@/utils/animations/face-image'

/**
 * Gate a face/cover image behind decode: keep `decoded` false (the caller shows
 * a skeleton) until the `<img>` is fully decoded, then fade it in via the shared
 * face-image reveal. Re-runs whenever `source` changes — initial paint, a
 * replace, or the element being reinserted (e.g. flipping the preview away from
 * the cover and back).
 *
 * @param source - getter for the image src; a falsy value clears `decoded`.
 * @param img - template ref to the `<img>` element being revealed.
 */
export function useImageReveal(
  source: MaybeRefOrGetter<string | undefined>,
  img: Readonly<ShallowRef<HTMLImageElement | null>>
) {
  const decoded = ref(false)

  async function decodeThenReveal() {
    decoded.value = false
    await nextTick()

    const el = img.value
    if (!el) return

    // A cached image (flipping the preview away and back) is already complete;
    // decode() can reject on the reinserted element, so skip it and reveal
    // straight away rather than waiting on a decode that never settles.
    if (!isLoaded(el)) {
      try {
        await el.decode()
      } catch {
        // decode() also rejects if the src changed mid-flight — but only bail
        // when the image really isn't loaded, so a newer run takes over. If it
        // IS loaded, fall through and reveal so the skeleton never sticks.
        if (!isLoaded(el)) return
      }
    }

    decoded.value = true
    await nextTick()
    if (img.value) revealFaceImage(img.value)
  }

  watch(
    () => toValue(source),
    (path) => {
      if (!path) {
        decoded.value = false
        return
      }
      decodeThenReveal()
    },
    { immediate: true }
  )

  return { decoded }
}

function isLoaded(el: HTMLImageElement) {
  return el.complete && el.naturalWidth > 0
}
