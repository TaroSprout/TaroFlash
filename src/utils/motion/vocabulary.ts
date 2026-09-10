/**
 * The one typed source of truth for how motion moves across the app: how fast
 * (durations), how sharp (easings), and how far (travel). GSAP tweens read the
 * TypeScript constants here; markup reads the `duration-*` / `ease-*` Tailwind
 * utilities generated from the same record.
 *
 * Run `pnpm gen:motion-css` after editing durations or easings, or the
 * generated stylesheet (`src/styles/motion.gen.css`) still carries the old
 * values. Travel emits `--travel-*` custom properties there too, but has no
 * native Tailwind utility — read the numbers from `TRAVEL`.
 */

export interface Duration {
  readonly ms: number
  readonly s: number
}

function duration(ms: number): Duration {
  return { ms, s: ms / 1000 }
}

export const DURATIONS = {
  0: duration(0),
  100: duration(100),
  150: duration(150),
  200: duration(200),
  300: duration(300),
  500: duration(500)
} as const

export interface Easing {
  readonly gsap: string
  readonly css: string
}

// spring / spring-strong collapse the six back.* overshoots that were scattered
// across the animation modules into two. Their cubic-beziers are the standard
// ease-out-back curves whose overshoot matches back.out(1.7) and back.out(2).
export const EASINGS = {
  out: { gsap: 'power2.out', css: 'cubic-bezier(0, 0, 0.2, 1)' },
  'out-strong': { gsap: 'power4.out', css: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  in: { gsap: 'power2.in', css: 'cubic-bezier(0.4, 0, 1, 1)' },
  'in-out': { gsap: 'power2.inOut', css: 'cubic-bezier(0.4, 0, 0.2, 1)' },
  spring: { gsap: 'back.out(1.7)', css: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  'spring-strong': { gsap: 'back.out(2)', css: 'cubic-bezier(0.34, 1.8, 0.64, 1)' }
} as const

export const TRAVEL = {
  8: 8,
  16: 16,
  24: 24,
  48: 48,
  96: 96
} as const
