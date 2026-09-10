export interface PerfScanSnapshot {
  onScreenElementCount: number
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

export function scanPerf(root: ParentNode = document.body): PerfScanSnapshot {
  const elements = root.querySelectorAll('*')
  let onScreenElementCount = 0

  for (const el of elements) {
    const rect = el.getBoundingClientRect()
    if (!isOnScreen(rect)) continue

    onScreenElementCount++
  }

  return { onScreenElementCount }
}
