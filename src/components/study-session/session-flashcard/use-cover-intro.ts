import { onMounted, watch } from 'vue'
import { placeTitleOnProgress, settleStudyingChrome } from '@/utils/animations/session-intro'

type CoverIntroOptions = {
  isCover: () => boolean
  title: () => HTMLElement | undefined | null
  progress: () => HTMLElement | undefined | null
}

/**
 * Drives the cover→studying intro: while on the cover the deck title is parked
 * over the progress slot (filling the gap under the header); on start it slides
 * back into the header as the progress bar fades in. Both elements live in
 * separate child components, so this reads them through getters and only acts
 * once they're mounted.
 *
 * @example
 * useCoverIntro({
 *   isCover: () => is_cover.value,
 *   title: () => header.value?.title_el,
 *   progress: () => progress.value?.root
 * })
 */
export function useCoverIntro({ isCover, title, progress }: CoverIntroOptions) {
  onMounted(() => {
    if (!isCover()) return
    const t = title()
    const p = progress()
    if (t && p) placeTitleOnProgress(t, p)
  })

  watch(isCover, (cover) => {
    if (cover) return
    const t = title()
    const p = progress()
    if (t && p) settleStudyingChrome(t, p)
  })
}
