export function createGsapTimelineMock() {
  const timelines = []

  function timeline() {
    const state = { onComplete: null, calls: { to: [], call: [] }, killed: false }
    const tl = {
      to: (...args) => {
        state.calls.to.push(args)
        return tl
      },
      fromTo: (...args) => {
        state.calls.to.push(args)
        return tl
      },
      call: (fn, _params, position) => {
        state.calls.call.push({ fn, position })
        return tl
      },
      eventCallback: (_name, cb) => {
        state.onComplete = cb
        return tl
      },
      play: () => {
        queueMicrotask(() => state.onComplete?.()) // self-completes so tests drive the motion driver without a real GSAP tick
        return tl
      },
      progress: (value) => {
        if (value === 1 && state.onComplete) state.onComplete()
        return tl
      },
      kill: () => {
        state.killed = true
        return tl
      },
      state
    }
    timelines.push(tl)
    return tl
  }

  return { timeline, timelines, isTweening: () => false, set: () => {} }
}

export function motionStoreStub(overrides = {}) {
  return {
    tier: 'full',
    factors: { duration: 1 },
    prefers_reduced_motion: false,
    has_coarse_pointer: false,
    ...overrides // callers override the default useMotionStore() shape per test
  }
}
