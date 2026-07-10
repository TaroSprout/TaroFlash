import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { reactive } from 'vue'
import App from '@/App.vue'
import { useNoticeStore } from '@/stores/notice-store'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// App.vue's onMounted pulls in theme/session/member stores (which themselves
// pull in vue-router + the member query), plus the audio player and its
// lifecycle wiring, and the safe-area padding installer. None of that is
// relevant to the member-error watcher under test, so every dependency is
// mocked to keep the mount cheap and deterministic.

const {
  mockLoad,
  mockStartLoading,
  mockStopLoading,
  mockSetup,
  mockInstallAudioLifecycle,
  mockInstallSafeAreaPadding,
  mockTeardownSafeAreaPadding
} = vi.hoisted(() => ({
  mockLoad: vi.fn(),
  mockStartLoading: vi.fn(),
  mockStopLoading: vi.fn(),
  mockSetup: vi.fn(() => Promise.resolve()),
  mockInstallAudioLifecycle: vi.fn(() => vi.fn()),
  mockInstallSafeAreaPadding: vi.fn(),
  mockTeardownSafeAreaPadding: vi.fn()
}))

vi.mock('@/stores/theme', () => ({
  useThemeStore: () => ({ load: mockLoad })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ startLoading: mockStartLoading, stopLoading: mockStopLoading })
}))

const mockMember = reactive({ preferences: {}, error: null })

vi.mock('@/stores/member', () => ({
  useMemberStore: () => mockMember
}))

vi.mock('@/sfx/player', () => ({
  default: { setup: mockSetup, setVolumeConfig: vi.fn() }
}))

vi.mock('@/sfx/lifecycle', () => ({
  installAudioLifecycle: mockInstallAudioLifecycle
}))

vi.mock('@/composables/ui/safe-area', () => ({
  installSafeAreaPadding: mockInstallSafeAreaPadding
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
  mockInstallSafeAreaPadding.mockReset().mockReturnValue(mockTeardownSafeAreaPadding)
  mockTeardownSafeAreaPadding.mockReset()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('App', () => {
  describe('safe-area padding lifecycle [obligation]', () => {
    test('calls installSafeAreaPadding on mount [obligation]', () => {
      const wrapper = mountApp()

      expect(mockInstallSafeAreaPadding).toHaveBeenCalledTimes(1)
      wrapper.unmount()
    })

    test('calls the returned teardown on unmount [obligation]', () => {
      const wrapper = mountApp()

      wrapper.unmount()

      expect(mockTeardownSafeAreaPadding).toHaveBeenCalledTimes(1)
    })
  })

  describe('member.error watcher [obligation]', () => {
    test('fires a panel notice with closable:false and a Refresh action when member.error becomes truthy [obligation]', async () => {
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
})
