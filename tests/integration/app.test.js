import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { reactive } from 'vue'
import App from '@/App.vue'
import { useNoticeStore } from '@/stores/notice-store'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// App.vue's onMounted pulls in theme/session/member stores (which themselves
// pull in vue-router + the member query), plus the audio player and its
// lifecycle wiring. None of that is relevant to the member-error watcher under
// test, so every dependency is mocked to keep the mount cheap and deterministic.

const {
  mockLoad,
  mockStartLoading,
  mockStopLoading,
  mockForceLogout,
  mockSetup,
  mockInstallAudioLifecycle
} = vi.hoisted(() => ({
  mockLoad: vi.fn(),
  mockStartLoading: vi.fn(),
  mockStopLoading: vi.fn(),
  mockForceLogout: vi.fn(),
  mockSetup: vi.fn(() => Promise.resolve()),
  mockInstallAudioLifecycle: vi.fn(() => vi.fn())
}))

vi.mock('@/stores/theme', () => ({
  useThemeStore: () => ({ load: mockLoad })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({
    startLoading: mockStartLoading,
    stopLoading: mockStopLoading,
    forceLogout: mockForceLogout
  })
}))

const mockMember = reactive({ preferences: {}, error: null, profile_missing: false })

vi.mock('@/stores/member', () => ({
  useMemberStore: () => mockMember
}))

vi.mock('@/sfx/player', () => ({
  default: { setup: mockSetup, setVolumeConfig: vi.fn() }
}))

vi.mock('@/sfx/lifecycle', () => ({
  installAudioLifecycle: mockInstallAudioLifecycle
}))

// ── Mount helper ──────────────────────────────────────────────────────────────

function mountApp() {
  return shallowMount(App, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: {
        RouterView: true
      }
    }
  })
}

// ── State reset ───────────────────────────────────────────────────────────────

beforeEach(() => {
  mockMember.error = null
  mockMember.profile_missing = false
  mockForceLogout.mockReset()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('App', () => {
  describe('member.error watcher', () => {
    test('fires a panel notice with closable:false and a Refresh action when member.error becomes truthy', async () => {
      const wrapper = mountApp()
      const notice = useNoticeStore()

      mockMember.error = new Error('fetch failed')
      await flushPromises()

      expect(notice.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          variant: 'panel',
          closable: false,
          actions: expect.arrayContaining([
            expect.objectContaining({ onClick: expect.any(Function) })
          ])
        })
      )
      wrapper.unmount()
    })

    test('does NOT fire a notice on mount when member.error is falsy', () => {
      mountApp()
      const notice = useNoticeStore()

      expect(notice.error).not.toHaveBeenCalled()
    })
  })

  describe('member.profile_missing watcher', () => {
    test('tears down the session with the account-deleted reason when the profile goes missing', async () => {
      const wrapper = mountApp()

      mockMember.profile_missing = true
      await flushPromises()

      expect(mockForceLogout).toHaveBeenCalledWith('account-deleted')
      wrapper.unmount()
    })

    test('tears down immediately when the profile is already known missing at mount', () => {
      mockMember.profile_missing = true

      const wrapper = mountApp()

      expect(mockForceLogout).toHaveBeenCalledWith('account-deleted')
      wrapper.unmount()
    })

    test('does NOT tear down while profile_missing is false', async () => {
      const wrapper = mountApp()

      await flushPromises()

      expect(mockForceLogout).not.toHaveBeenCalled()
      wrapper.unmount()
    })
  })
})
