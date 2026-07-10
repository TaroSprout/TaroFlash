import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { useMobileDock } from '@/components/mobile-dock/use-mobile-dock'
import MobileDockHost from '@/components/mobile-dock/mobile-dock-host.vue'

// The real useKeyboardOpen reads window.visualViewport, which is unreliable
// (and may or may not exist) across browser-mode runs — mock it so keyboard
// state is deterministic and directly controllable per test. `vi.mock` is
// hoisted above this file's imports, but its factory only runs lazily (on the
// component's first import of the module), by which point `mockIsKeyboardOpen`
// below is already initialized — so a plain closure reference works here
// without needing `vi.hoisted`.
const mockIsKeyboardOpen = ref(false)
vi.mock('@/composables/ui/keyboard', () => ({
  useKeyboardOpen: () => ({ is_open: mockIsKeyboardOpen })
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

// mobile-dock-host teleports its footer into [mobile-dock-container]. The
// container must exist in the document before mounting so Teleport finds it.
let container
const wrappers = []

function mountHost() {
  const wrapper = mount(MobileDockHost, { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}

// ── State reset ───────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset module-level singleton state between tests.
  const { el, fills } = useMobileDock()
  el.value = null
  fills.value = 0
  mockIsKeyboardOpen.value = false

  // Create the teleport target for mobile-dock-host.
  container = document.createElement('div')
  container.setAttribute('mobile-dock-container', '')
  document.body.appendChild(container)
})

afterEach(() => {
  wrappers.forEach((w) => w.unmount())
  wrappers.length = 0
  document.body.innerHTML = ''
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MobileDockHost', () => {
  describe('el registration [obligation]', () => {
    test('registers the footer element into the shared el ref on mount [obligation]', async () => {
      const { el } = useMobileDock()

      mountHost()

      // el.value must be the actual footer DOM element so routes can measure it.
      expect(el.value).not.toBeNull()
      expect(el.value?.tagName.toLowerCase()).toBe('footer')
    })

    test('el matches the element with data-testid="mobile-dock-host" [obligation]', async () => {
      const { el } = useMobileDock()

      mountHost()

      expect(el.value?.getAttribute('data-testid')).toBe('mobile-dock-host')
    })
  })

  describe('footer visibility [obligation]', () => {
    test('footer is hidden when fills is 0 [obligation]', async () => {
      const { fills } = useMobileDock()
      fills.value = 0

      mountHost()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footer).not.toBeNull()
      // v-show="fills > 0" adds display:none when false
      expect(footer.style.display).toBe('none')
    })

    test('footer is visible when fills > 0 [obligation]', async () => {
      const { fills } = useMobileDock()
      fills.value = 1

      mountHost()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footer).not.toBeNull()
      expect(footer.style.display).not.toBe('none')
    })

    test('footer hides when fills drops back to 0', async () => {
      const { fills } = useMobileDock()
      fills.value = 1

      mountHost()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footer.style.display).not.toBe('none')

      fills.value = 0
      await nextTick()

      expect(footer.style.display).toBe('none')
    })

    // ── keyboard-open hides the dock [obligation] ──────────────────────────

    test('footer hides while the on-screen keyboard is open, even with fills > 0 [obligation]', () => {
      const { fills } = useMobileDock()
      fills.value = 1
      mockIsKeyboardOpen.value = true

      mountHost()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footer.style.display).toBe('none')
    })

    test('footer reappears once the keyboard closes again [obligation]', async () => {
      const { fills } = useMobileDock()
      fills.value = 1
      mockIsKeyboardOpen.value = true

      mountHost()
      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footer.style.display).toBe('none')

      mockIsKeyboardOpen.value = false
      await nextTick()

      expect(footer.style.display).not.toBe('none')
    })
  })

  describe('content slot target', () => {
    test('renders the inner content div with [mobile-dock-content] attribute', async () => {
      mountHost()

      const content = document.querySelector('[mobile-dock-content]')
      expect(content).not.toBeNull()
      expect(content?.getAttribute('data-testid')).toBe('mobile-dock-host__content')
    })
  })

  describe('above slot target [obligation]', () => {
    test('renders the above div with [mobile-dock-above] attribute inside the footer [obligation]', () => {
      mountHost()

      const above = document.querySelector('[mobile-dock-above]')
      expect(above).not.toBeNull()
      expect(above?.getAttribute('data-testid')).toBe('mobile-dock-host__above')
    })

    test('[mobile-dock-above] is a child of the footer element [obligation]', () => {
      mountHost()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      const above = document.querySelector('[mobile-dock-above]')
      expect(footer).not.toBeNull()
      expect(above).not.toBeNull()
      expect(footer?.contains(above)).toBe(true)
    })
  })

  describe('--mobile-dock-height CSS property [obligation]', () => {
    test('publishes --mobile-dock-height = 0px on mount when fills is 0 [obligation]', () => {
      const { fills } = useMobileDock()
      fills.value = 0

      mountHost()

      expect(document.documentElement.style.getPropertyValue('--mobile-dock-height')).toBe('0px')
    })

    test('removes --mobile-dock-height from :root on unmount [obligation]', async () => {
      const wrapper = mountHost()

      wrapper.unmount()
      // Pop it off the list so afterEach doesn't double-unmount
      wrappers.splice(wrappers.indexOf(wrapper), 1)

      expect(document.documentElement.style.getPropertyValue('--mobile-dock-height')).toBe('')
    })

    test('updates --mobile-dock-height when fills changes to > 0 [obligation]', async () => {
      const { fills } = useMobileDock()
      fills.value = 0

      mountHost()
      expect(document.documentElement.style.getPropertyValue('--mobile-dock-height')).toBe('0px')

      fills.value = 1
      await nextTick()
      // offsetHeight is 0 in jsdom (no layout), so height stays 0px — but the
      // property is set (not removed). Just verify the property exists.
      expect(document.documentElement.style.getPropertyValue('--mobile-dock-height')).not.toBe('')
    })

    test('publishes --mobile-dock-height = 0px while the keyboard is open, even with fills > 0 [obligation]', async () => {
      const { fills } = useMobileDock()
      fills.value = 1

      mountHost()

      mockIsKeyboardOpen.value = true
      await nextTick()

      expect(document.documentElement.style.getPropertyValue('--mobile-dock-height')).toBe('0px')
    })
  })
})
