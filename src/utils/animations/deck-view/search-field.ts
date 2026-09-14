import { gsap } from 'gsap'
import type { DriveWidth } from '@/components/layout-kit/stage/use-stage-height'

const DURATION = 0.3
const EASE = 'power3.out'

/** Reveal the search input by widening it from 0 to `width`px through the stage width driver as it fades in. */
export function expandSearchInput(
  input: HTMLElement,
  width: number,
  driveWidth: DriveWidth,
  done?: () => void
) {
  gsap.fromTo(
    input,
    { opacity: 0 },
    { opacity: 1, duration: DURATION, ease: EASE, overwrite: 'auto' }
  )

  const change = driveWidth(width, { duration: DURATION, ease: EASE })
  void change.settled.then(() => done?.())
}

/** Reverse of {@link expandSearchInput}: collapse the input back to nothing through the stage width driver. */
export function collapseSearchInput(input: HTMLElement, driveWidth: DriveWidth, done?: () => void) {
  gsap.to(input, { opacity: 0, duration: DURATION, ease: EASE, overwrite: 'auto' })

  const change = driveWidth(0, { duration: DURATION, ease: EASE })
  void change.settled.then(() => done?.())
}
