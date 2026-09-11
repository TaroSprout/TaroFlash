import { gsap } from 'gsap'
import { getCurrentScope, onScopeDispose } from 'vue'
import { useMotionStore } from '@/stores/motion'
import { DURATIONS, EASINGS, TRAVEL } from './vocabulary'
import type {
  DeclarativeMotionSpec,
  DurationToken,
  EaseToken,
  Motion,
  MotionContext,
  MotionHandle,
  MotionOptions,
  MotionVars,
  TravelToken
} from './types'

/** The properties a motion may touch, promoted to their own layer for its duration. */
const WILL_CHANGE = 'transform, opacity'

interface Mark {
  promise: Promise<void>
  resolve: () => void
}

function createMark(): Mark {
  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function tierDurationScale(): number {
  return useMotionStore().factors.duration
}

function resolveDuration(token: DurationToken): number {
  return DURATIONS[token].s * tierDurationScale()
}

function resolveEase(token: EaseToken): string {
  return EASINGS[token].gsap
}

/** Called outside a Vue scope, the caller must `cancel()` the returned handle itself — auto-cleanup only fires inside an active scope. */
function runMotion(
  el: HTMLElement,
  build: (ctx: MotionContext) => void,
  options: MotionOptions
): MotionHandle {
  const { promote = true, clearOnComplete = false, interrupt = 'hand-back' } = options

  const marks = new Map<string, Mark>()
  let resolveDone!: () => void
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve
  })

  const tl = gsap.timeline({ paused: true })
  if (promote) el.style.willChange = WILL_CHANGE

  let settled = false
  function settle(clear_transform: boolean) {
    if (settled) return
    settled = true

    el.style.willChange = ''
    // A settled inline transform still traps overlays inside the element, so hand it back to CSS. →[K:settled-transform-traps-overlays]
    if (clear_transform) gsap.set(el, { clearProps: 'transform,opacity' })

    for (const mark of marks.values()) mark.resolve()
    resolveDone()
  }

  const ctx: MotionContext = {
    tl,
    taking_over: gsap.isTweening(el),
    duration: resolveDuration,
    ease: resolveEase,
    travel: (token: TravelToken) => TRAVEL[token],
    mark(name: string, position?: number) {
      const mark = createMark()
      marks.set(name, mark)
      tl.call(mark.resolve, undefined, position)
    }
  }

  build(ctx)

  tl.eventCallback('onComplete', () => settle(clearOnComplete))
  tl.play()

  function cancel() {
    if (settled) return

    if (interrupt === 'snap-complete') {
      // A half-left element must finish leaving, not spring back to its resting position.
      tl.progress(1)
      return
    }

    tl.kill()
    settle(true)
  }

  function finish() {
    tl.progress(1)
  }

  if (getCurrentScope()) onScopeDispose(cancel)

  return {
    done,
    mark: (name: string) =>
      marks.get(name)?.promise ?? Promise.reject(new Error(`motion has no mark named "${name}"`)),
    finish,
    cancel
  }
}

/** A takeover starts from the element's live values, so a fresh `from` placement is skipped mid-flight. */
function applyTween(ctx: MotionContext, el: HTMLElement, spec: DeclarativeMotionSpec) {
  const to: MotionVars & gsap.TweenVars = {
    ...spec.to,
    duration: ctx.duration(spec.duration),
    ease: ctx.ease(spec.ease ?? 'out'),
    delay: spec.delay,
    overwrite: 'auto'
  }

  if (spec.from && !ctx.taking_over) {
    ctx.tl.fromTo(el, spec.from, to)
    return
  }

  ctx.tl.to(el, to)
}

function registerMarks(ctx: MotionContext, spec: DeclarativeMotionSpec) {
  if (!spec.marks) return

  const total = ctx.duration(spec.duration)
  for (const [name, fraction] of Object.entries(spec.marks)) {
    ctx.mark(name, total * fraction)
  }
}

/** Declarative authoring for the common single-tween case. */
export function defineMotion(spec: DeclarativeMotionSpec): Motion {
  return (el: HTMLElement) =>
    runMotion(
      el,
      (ctx) => {
        applyTween(ctx, el, spec)
        registerMarks(ctx, spec)
      },
      spec
    )
}

/** Imperative escape hatch for a complex timeline that a single tween can't express. */
export function motion(
  build: (el: HTMLElement, ctx: MotionContext) => void,
  options: MotionOptions = {}
): Motion {
  return (el: HTMLElement) => runMotion(el, (ctx) => build(el, ctx), options)
}
