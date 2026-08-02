import { nextTick, ref, toValue, watch, type MaybeRefOrGetter, type ShallowRef } from 'vue'
import { revealFaceImage } from '@/utils/animations/face-image'

/**
 * Gate a face/cover image behind decode: `decoded` stays false (caller shows a
 * skeleton) until the `<img>` decodes, then fades in via revealFaceImage. Re-runs
 * on every `source` change, including the element being reinserted after a flip.
 *
 * @param source - getter for the image src; falsy clears `decoded`.
 * @param img - template ref to the `<img>` being revealed.
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

    // A cached image (flip away + back) is already loaded, and decode() can
    // reject on the reinserted element — skip decode when it's already loaded.
    if (!isLoaded(el)) {
      try {
        await el.decode()
      } catch {
        // Bail only if genuinely not loaded (src changed mid-flight); a loaded
        // image reveals anyway so the skeleton never sticks.
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
