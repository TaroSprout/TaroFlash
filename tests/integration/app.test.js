import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import App from '@/App.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// App.vue's onMounted pulls in theme/session/member stores (which themselves
// pull in vue-router + the member query), plus the audio player and its
// lifecycle wiring. None of that is relevant to the standalone-detection
// logic under test, so every dependency is mocked to keep the mount cheap and
// deterministic.

const { mockLoad, mockStartLoading, mockStopLoading, mockSetup, mockInstallAudioLifecycle } =
  vi.hoisted(() => ({
    mockLoad: vi.fn(),
    mockStartLoading: vi.fn(),
    mockStopLoading: vi.fn(),
    mockSetup: vi.fn(() => Promise.resolve()),
    mockInstallAudioLifecycle: vi.fn(() => vi.fn())
  }))

vi.mock('@/stores/theme', () => ({
  useThemeStore: () => ({ load: mockLoad })
}))

vi.mock('@/stores/session', () => ({
  useSessionStore: () => ({ startLoading: mockStartLoading, stopLoading: mockStopLoading })
}))

vi.mock('@/stores/member', () => ({
  useMemberStore: () => ({ preferences: {} })
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
      stubs: {
        RouterView: true
      }
    }
  })
}

// ── State reset ───────────────────────────────────────────────────────────────

let original_matchMedia
let original_navigator_standalone

beforeEach(() => {
  original_matchMedia = window.matchMedia
  original_navigator_standalone = window.navigator.standalone
  document.documentElement.removeAttribute('data-standalone')
})

afterEach(() => {
  window.matchMedia = original_matchMedia
  if (original_navigator_standalone === undefined) {
    delete window.navigator.standalone
  } else {
    window.navigator.standalone = original_navigator_standalone
  }
  document.documentElement.removeAttribute('data-standalone')
})

function stubMatchMedia(matches) {
  window.matchMedia = vi.fn().mockReturnValue({ matches })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('App', () => {
  describe('data-standalone detection [obligation]', () => {
    test('sets data-standalone="true" on <html> when display-mode: standalone matches [obligation]', () => {
      stubMatchMedia(true)
      delete window.navigator.standalone

      mountApp()

      expect(document.documentElement.getAttribute('data-standalone')).toBe('true')
    })

    test('sets data-standalone="true" via the navigator.standalone iOS fallback when display-mode does not match [obligation]', () => {
      stubMatchMedia(false)
      window.navigator.standalone = true

      mountApp()

      expect(document.documentElement.getAttribute('data-standalone')).toBe('true')
    })

    test('sets data-standalone="false" when neither display-mode nor navigator.standalone match [obligation]', () => {
      stubMatchMedia(false)
      delete window.navigator.standalone

      mountApp()

      expect(document.documentElement.getAttribute('data-standalone')).toBe('false')
    })
  })
})
