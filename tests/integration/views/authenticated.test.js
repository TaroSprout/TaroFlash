import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import AuthenticatedView from '@/views/authenticated.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockUseResumeStudySession, mockUseRouteTransition } = vi.hoisted(() => ({
  mockUseResumeStudySession: vi.fn(),
  mockUseRouteTransition: vi.fn(() => ({
    show_skeleton_overlay: { value: false },
    onSuspensePending: vi.fn(),
    onSuspenseResolve: vi.fn(),
    onLeave: vi.fn(),
    onEnter: vi.fn()
  }))
}))

vi.mock('@/components/study-session/composables/session-resume', () => ({
  useResumeStudySession: mockUseResumeStudySession
}))

vi.mock('@/composables/ui/route-transition', () => ({
  useRouteTransition: mockUseRouteTransition
}))

// ── Mount helper ──────────────────────────────────────────────────────────────

function mountAuthenticated() {
  return shallowMount(AuthenticatedView, {
    global: {
      stubs: {
        NavBar: true,
        TaroPhone: true,
        MobileDockHost: true,
        RouteSkeleton: true,
        RouterView: true
      }
    }
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthenticatedView', () => {
  beforeEach(() => {
    mockUseResumeStudySession.mockClear()
    mockUseRouteTransition.mockClear()
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
})
