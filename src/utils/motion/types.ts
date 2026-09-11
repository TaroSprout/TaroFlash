import type { gsap } from 'gsap'
import type { DURATIONS, EASINGS, TRAVEL } from './vocabulary'

export type DurationToken = keyof typeof DURATIONS
export type EaseToken = keyof typeof EASINGS
export type TravelToken = keyof typeof TRAVEL

/**
 * The properties a motion may touch. Transform-family and opacity only, so every
 * motion stays on the compositor; layout and height motion route through the
 * stage primitive (#406) rather than animating a layout property here.
 */
export interface MotionVars {
  x?: number | string
  y?: number | string
  translateX?: number | string
  translateY?: number | string
  xPercent?: number
  yPercent?: number
  scale?: number
  scaleX?: number
  scaleY?: number
  rotate?: number | string
  rotation?: number | string
  rotateX?: number | string
  rotateY?: number | string
  transformOrigin?: string
  transformPerspective?: number
  opacity?: number
}

/** What a running motion does with its inline styles when it stops early rather than completing. */
export type InterruptBehaviour = 'hand-back' | 'snap-complete'

export interface MotionOptions {
  // Toggles `will-change` for the duration of the motion; the driver clears it on settle.
  promote?: boolean
  // Clears the inline transform when the motion lands, handing the resting state back to the stylesheet.
  clearOnComplete?: boolean
  interrupt?: InterruptBehaviour
}

export interface DeclarativeMotionSpec extends MotionOptions {
  from?: MotionVars
  to: MotionVars
  duration: DurationToken
  ease?: EaseToken
  // A pre-roll before the tween starts, in seconds — not a vocabulary axis, so a raw value is allowed here.
  delay?: number
  // A named point in the tween, keyed by name, positioned as a fraction (0–1) of the scaled duration.
  marks?: Record<string, number>
}

/** The timeline builder's toolkit — tokens resolved through the active tier, plus mark registration. */
export interface MotionContext {
  tl: gsap.core.Timeline
  taking_over: boolean
  duration(token: DurationToken): number
  ease(token: EaseToken): string
  travel(token: TravelToken): number
  // Registers a named point, defaulting to the timeline's current end when no position is given.
  mark(name: string, position?: number): void
}

export interface MotionHandle {
  done: Promise<void>
  mark(name: string): Promise<void>
  finish(): void
  cancel(): void
}

/** An invokable motion — `defineMotion` and `motion` both compile to this. */
export type Motion = (el: HTMLElement) => MotionHandle
