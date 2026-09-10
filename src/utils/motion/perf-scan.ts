export interface PerfScanSnapshot {
  onScreenElementCount: number
  standingEffectAreaRatio: number
}

function isOnScreen(rect: DOMRect): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  )
}

/** Whether `el` carries an expensive standing effect: a `bgx-*` pattern, a backdrop blur, or a
 * looping CSS animation (an "ambient loop"). A JS-driven ambient loop leaves none of these marks,
 * so it goes uncounted here. →[K:perf-scan-no-js-loop-marker]
 */
function hasStandingEffect(el: Element): boolean {
  if (/\bbgx-/.test(el.className.toString())) return true

  const style = window.getComputedStyle(el)
  if (style.backdropFilter !== 'none' && style.backdropFilter !== '') return true

  return style.animationName !== 'none' && style.animationIterationCount === 'infinite'
}

export function scanPerf(root: ParentNode = document.body): PerfScanSnapshot {
  const elements = root.querySelectorAll('*')
  let onScreenElementCount = 0
  let standingEffectArea = 0

  for (const el of elements) {
    const rect = el.getBoundingClientRect()
    if (!isOnScreen(rect)) continue

    onScreenElementCount++
    if (hasStandingEffect(el)) standingEffectArea += rect.width * rect.height
  }

  const viewportArea = window.innerWidth * window.innerHeight
  const standingEffectAreaRatio = viewportArea > 0 ? standingEffectArea / viewportArea : 0

  return { onScreenElementCount, standingEffectAreaRatio }
}
