import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, reactive, ref } from 'vue'
import AuthenticatedView from '@/views/app-shell/authenticated.vue'

// Renders the `v-slot="{ Component, route }"` content for real, so the
// transition/suspense/route-skeleton wiring around it gets exercised — the
// default auto-stub hides slot content entirely.
const RouterViewStub = defineComponent({
  name: 'RouterView',
  setup(_props, { slots }) {
    const fakeComponent = defineComponent({
      name: 'FakeRouteComponent',
      setup: () => () => h('div', { 'data-testid': 'fake-route-component' })
    })
    const fakeRoute = { name: 'fake-route' }
    return () => slots.default?.({ Component: fakeComponent, route: fakeRoute })
  }
})

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockUseResumeStudySession, mockUseRouteTransition, mockMemberStoreState, mockOpenNotice } =
  vi.hoisted(() => ({
    mockUseResumeStudySession: vi.fn(),
    // A real ref, not a plain `{ value: false }` object — the component reads
    // `show_skeleton_overlay.value` through the `show_skeleton` computed, so
    // the mock must carry real ref semantics for that read to mean anything.
    mockUseRouteTransition: vi.fn(() => ({
      show_skeleton_overlay: ref(false),
      onSuspensePending: vi.fn(),
      onSuspenseResolve: vi.fn(),
      onLeave: vi.fn(),
      onEnter: vi.fn()
    })),
    mockMemberStoreState: { pending_deletion: false },
    mockOpenNotice: vi.fn()
  }))

vi.mock('@/views/study-session/composables/session-resume', () => ({
  useResumeStudySession: mockUseResumeStudySession
}))

vi.mock('@/composables/ui/route-transition', () => ({
  useRouteTransition: mockUseRouteTransition
}))

// `reactive()` wraps the same hoisted target every call — Vue caches the proxy
// per target, so the component's useMemberStore() and this test file's mutate
// the same live object and the watch under test actually reacts.
vi.mock('@/stores/member', () => ({
  useMemberStore: () => reactive(mockMemberStoreState)
}))

vi.mock('@/composables/member/pending-deletion-notice', () => ({
  usePendingDeletionNotice: () => ({ open: mockOpenNotice })
}))

// The reactive proxy itself, so tests mutate through it (writes to the raw
// target below would bypass Vue's reactivity trap and never trigger the watch).
const mockMemberStore = reactive(mockMemberStoreState)

// ── Mount helper ──────────────────────────────────────────────────────────────
//
// Every instance sets up its own watch() on the shared reactive member-store
// singleton above, so a wrapper left mounted from a previous test would react
// to the next test's mutation too. Track and unmount after each test.

let activeWrapper

function mountAuthenticated({ renderRouteSlot = false } = {}) {
  activeWrapper = shallowMount(AuthenticatedView, {
    global: {
      stubs: {
        NavBar: true,
        TaroPhone: true,
        MobileDockHost: true,
        RouteSkeleton: true,
        RouterView: renderRouteSlot ? RouterViewStub : true,
        // Real Suspense so the matched-component branch (not just the
        // fallback) actually renders — auto-stubbing it hides both.
        Suspense: !renderRouteSlot
      }
    }
  })
  return activeWrapper
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthenticatedView', () => {
  beforeEach(() => {
    mockUseResumeStudySession.mockClear()
    mockUseRouteTransition.mockClear()
    mockMemberStore.pending_deletion = false
    mockOpenNotice.mockClear()
  })

  afterEach(() => {
    activeWrapper?.unmount()
    activeWrapper = undefined
  })

  test('calls useResumeStudySession on setup, so refresh mid-session reopens the study modal [obligation]', () => {
    mountAuthenticated()

    expect(mockUseResumeStudySession).toHaveBeenCalledOnce()
  })

  test('renders the nav-bar, taro-phone, and mobile-dock-host chrome', () => {
    const wrapper = mountAuthenticated()

    expect(wrapper.findComponent({ name: 'NavBar' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'TaroPhone' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'MobileDockHost' }).exists()).toBe(true)
  })

  test('renders the router-view outlet', () => {
    const wrapper = mountAuthenticated()

    expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true)
  })

  test('renders the matched route component inside the transition/suspense wrapper', async () => {
    const wrapper = mountAuthenticated({ renderRouteSlot: true })
    await flushPromises()

    expect(wrapper.find('[data-testid="route-container"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'FakeRouteComponent' }).exists()).toBe(true)
  })

  // ── pending-deletion watcher [obligation] ───────────────────────────────────

  describe('pending-deletion watcher [obligation]', () => {
    test('[obligation] opens the pending-deletion notice immediately on a cold load of an already-suspended member', async () => {
      mockMemberStore.pending_deletion = true

      mountAuthenticated()
      await flushPromises()

      expect(mockOpenNotice).toHaveBeenCalledOnce()
    })

    test('does not open the notice on mount for a member in good standing', async () => {
      mockMemberStore.pending_deletion = false

      mountAuthenticated()
      await flushPromises()

      expect(mockOpenNotice).not.toHaveBeenCalled()
    })

    // [obligation] the member row resolves after the shell has already mounted
    // (query lands async) — the watcher must react to that later flip, not
    // just the immediate value at mount time.
    test('[obligation] opens the notice when pending_deletion flips true after mount', async () => {
      mountAuthenticated()
      await flushPromises()
      expect(mockOpenNotice).not.toHaveBeenCalled()

      mockMemberStore.pending_deletion = true
      await flushPromises()

      expect(mockOpenNotice).toHaveBeenCalledOnce()
    })

    // [obligation] the checkpoint no longer diverts a pending-deletion member to
    // welcome — the shell renders the route skeleton underneath the panel
    // instead of redirecting away.
    test('[obligation] the route-container still renders for a pending-deletion member — no redirect away from the shell', async () => {
      mockMemberStore.pending_deletion = true

      const wrapper = mountAuthenticated()
      await flushPromises()

      expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true)
    })
  })

  // ── route-skeleton overlay [obligation] ─────────────────────────────────────
  //
  // The overlay must mask a pending-deletion member's real route content —
  // decks are RLS-zeroed, but the dashboard/account section itself still
  // painted behind the restore dialog before the fix.

  describe('route-skeleton overlay [obligation]', () => {
    test('[obligation] a pending-deletion member sees the route-skeleton overlay over their real route content', async () => {
      mockMemberStore.pending_deletion = true

      const wrapper = mountAuthenticated({ renderRouteSlot: true })
      await flushPromises()

      expect(wrapper.find('[data-testid="route-skeleton-overlay"]').exists()).toBe(true)
    })

    test('a resolved member in good standing does not see the overlay, and the real route component renders', async () => {
      mockMemberStore.pending_deletion = false

      const wrapper = mountAuthenticated({ renderRouteSlot: true })
      await flushPromises()

      expect(wrapper.find('[data-testid="route-skeleton-overlay"]').exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'FakeRouteComponent' }).exists()).toBe(true)
    })
  })
})
