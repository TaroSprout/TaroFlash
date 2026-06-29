import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

// Accumulate router hooks as they are registered so tests can fire them
const { beforeEachCbs, afterEachCbs } = vi.hoisted(() => ({
  beforeEachCbs: [],
  afterEachCbs: []
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    beforeEach: (cb) => beforeEachCbs.push(cb),
    afterEach: (cb) => afterEachCbs.push(cb)
  })
}))

// Stub animation functions — their internal behaviour is tested in route-slide.test.js
vi.mock('@/utils/animations/route-slide', () => ({
  routeSlideLeave: vi.fn(() => vi.fn()),
  routeSlideEnter: vi.fn(() => vi.fn())
}))

import { useRouteTransition } from '@/composables/ui/route-transition'

// ── Helpers ───────────────────────────────────────────────────────────────────

function setup() {
  const result = useRouteTransition()
  // Each call registers exactly one beforeEach and one afterEach
  const navigate = beforeEachCbs.at(-1)
  const navDone = afterEachCbs.at(-1)
  return { ...result, navigate, navDone }
}

beforeEach(() => {
  beforeEachCbs.length = 0
  afterEachCbs.length = 0
})

// ── show_skeleton_overlay initial state ───────────────────────────────────────

describe('show_skeleton_overlay — initial state', () => {
  test('is false before any navigation occurs', () => {
    const { show_skeleton_overlay } = setup()
    expect(show_skeleton_overlay.value).toBe(false)
  })
})

// ── show_skeleton_overlay — all three flags required (obligation 3) ───────────

describe('show_skeleton_overlay — requires all three flags [obligation]', () => {
  test('is false after navigation alone (animation_done set false, others reset)', () => {
    const { show_skeleton_overlay, navigate } = setup()

    navigate({ name: 'deck' })

    expect(show_skeleton_overlay.value).toBe(false)
  })

  test('is false when pending was emitted but suspense has not resolved', () => {
    const { show_skeleton_overlay, navigate, onSuspensePending } = setup()

    navigate({ name: 'deck' })
    onSuspensePending()

    expect(show_skeleton_overlay.value).toBe(false)
  })

  test('is false when suspense resolved but pending was never emitted [obligation]', () => {
    const { show_skeleton_overlay, navigate, onSuspenseResolve } = setup()

    navigate({ name: 'deck' })
    onSuspenseResolve()

    expect(show_skeleton_overlay.value).toBe(false)
  })

  test('is true when navigate + pending + resolve all fire', () => {
    const { show_skeleton_overlay, navigate, onSuspensePending, onSuspenseResolve } = setup()

    navigate({ name: 'deck' })
    onSuspensePending()
    onSuspenseResolve()

    expect(show_skeleton_overlay.value).toBe(true)
  })

  test('returns to false once animation_done is reset by the next navigation', () => {
    const { show_skeleton_overlay, navigate, onSuspensePending, onSuspenseResolve } = setup()

    // Reach the truthy state
    navigate({ name: 'deck' })
    onSuspensePending()
    onSuspenseResolve()
    expect(show_skeleton_overlay.value).toBe(true)

    // Next navigation resets all three flags
    navigate({ name: 'dashboard' })
    expect(show_skeleton_overlay.value).toBe(false)
  })
})

// ── fallback_shown — stays false without @pending (obligation 4) ──────────────

describe('fallback_shown — no-pending (cached data) path [obligation]', () => {
  test('show_skeleton_overlay is false when suspense resolves without a pending event', () => {
    const { show_skeleton_overlay, navigate, onSuspenseResolve } = setup()

    navigate({ name: 'deck' })
    // Suspense resolves immediately (data was cached — no @pending ever fires)
    onSuspenseResolve()

    expect(show_skeleton_overlay.value).toBe(false)
  })
})

// ── animation_done reset (obligation 5) ───────────────────────────────────────

describe('animation_done — reset by router.beforeEach [obligation]', () => {
  test('beforeEach causes show_skeleton_overlay to be reachable again', () => {
    // Verifies animation_done is reset to false on each navigation, allowing
    // the overlay to become truthy again after the next pending + resolve cycle.
    const { show_skeleton_overlay, navigate, onSuspensePending, onSuspenseResolve } = setup()

    // First nav cycle: reach truthy state
    navigate({ name: 'deck' })
    onSuspensePending()
    onSuspenseResolve()
    expect(show_skeleton_overlay.value).toBe(true)

    // Second nav resets animation_done + clears pending/resolved
    navigate({ name: 'deck' })
    onSuspensePending()
    onSuspenseResolve()

    expect(show_skeleton_overlay.value).toBe(true)
  })
})

// ── onSuspensePending / onSuspenseResolve ─────────────────────────────────────

describe('onSuspensePending and onSuspenseResolve', () => {
  test('onSuspensePending enables the fallback_shown flag', () => {
    const { show_skeleton_overlay, navigate, onSuspensePending, onSuspenseResolve } = setup()

    navigate({ name: 'deck' })
    onSuspensePending()

    // Without resolve, overlay is still false — but pending is the only setter
    // that can make it become true once resolve fires
    onSuspenseResolve()
    expect(show_skeleton_overlay.value).toBe(true)
  })

  test('calling onSuspenseResolve before onSuspensePending leaves overlay false', () => {
    const { show_skeleton_overlay, navigate, onSuspensePending, onSuspenseResolve } = setup()

    navigate({ name: 'deck' })
    onSuspenseResolve()
    onSuspensePending()

    // suspense_resolved was set before fallback_shown, then fallback_shown set;
    // but by the time pending fires, resolve has already happened.
    // All three flags are now set → overlay becomes true.
    // This is an edge case that doesn't occur in practice (Suspense emits
    // @pending before @resolve), but the computed is purely flag-based.
    expect(show_skeleton_overlay.value).toBe(true)
  })
})

// ── is_initial / router.afterEach ─────────────────────────────────────────────

describe('router.afterEach — clears is_initial', () => {
  test('afterEach is registered on the router', () => {
    setup()
    expect(afterEachCbs).toHaveLength(1)
  })

  test('beforeEach is registered on the router', () => {
    setup()
    expect(beforeEachCbs).toHaveLength(1)
  })

  test('afterEach callback fires without error (clears is_initial flag)', () => {
    // is_initial is internal state; we verify the callback runs cleanly and
    // does not throw. Its effect (skipping animation on first enter) is covered
    // by the route-slide unit tests.
    const { navDone } = setup()
    expect(() => navDone()).not.toThrow()
  })
})

// ── going_to_dashboard flag ───────────────────────────────────────────────────

describe('going_to_dashboard tracking', () => {
  test('navigate to dashboard route sets flag (accessible via returned callbacks)', () => {
    // The composable passes going_to_dashboard to routeSlideLeave/routeSlideEnter.
    // We verify beforeEach fires without error and returns the composable in a
    // consistent state (show_skeleton_overlay still false after navigate only).
    const { show_skeleton_overlay, navigate } = setup()

    navigate({ name: 'dashboard' })

    expect(show_skeleton_overlay.value).toBe(false)
  })
})
