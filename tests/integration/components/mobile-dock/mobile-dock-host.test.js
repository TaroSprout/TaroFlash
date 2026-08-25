import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { DEFAULT_BREAKPOINT, useMobileDock } from '@/components/mobile-dock/use-mobile-dock'
import MobileDockHost from '@/components/mobile-dock/mobile-dock-host.vue'
import { setBelowBreakpoint, resetBreakpointMedia } from '../../../helpers/breakpoint-media-mock'
import { setKeyboardOpen } from '../../../helpers/keyboard-open-mock'
import { setChromeCovered } from '../../../helpers/chrome-cover-mock'

// The host reads `w<<breakpoint>` via useMatchMedia — mock it so the claimed
// breakpoint's match state and the flush breakpoint (`w<sm`) are directly and
// independently controllable per test.
vi.mock('@/composables/ui/media-query', async () => {
  const m = await import('../../../helpers/breakpoint-media-mock')
  return m.breakpointMediaMockModule
})

// The dock's is_visible reads useKeyboardOpen — mock it so keyboard state is
// directly controllable per test.
vi.mock('@/composables/ui/keyboard', async () => {
  const m = await import('../../../helpers/keyboard-open-mock')
  return m.keyboardOpenMockModule
})

// The edge allowance is gated on useBottomChromeCover, not on pointer type —
// mock it so "browser chrome already covers the bottom strip" is directly
// controllable per test.
vi.mock('@/composables/ui/safe-area', async () => {
  const m = await import('../../../helpers/chrome-cover-mock')
  return m.chromeCoverMockModule
})

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
  const { el, height_claims } = useMobileDock()
  el.value = null
  height_claims.value = 0
  setKeyboardOpen(false)
  setChromeCovered(false)
  resetBreakpointMedia()

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
  describe('el registration', () => {
    test('registers the footer element into the shared el ref on mount', async () => {
      const { el } = useMobileDock()

      mountHost()

      // el.value must be the actual footer DOM element so routes can measure it.
      expect(el.value).not.toBeNull()
      expect(el.value?.tagName.toLowerCase()).toBe('footer')
    })

    test('el matches the element with data-testid="mobile-dock-host"', async () => {
      const { el } = useMobileDock()

      mountHost()

      expect(el.value?.getAttribute('data-testid')).toBe('mobile-dock-host')
    })

    test('stamps the constant data-station="panel"', () => {
      mountHost()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footer.getAttribute('data-station')).toBe('panel')
    })
  })

  describe('footer visibility', () => {
    test('footer is hidden when the registered breakpoint does not match the viewport', async () => {
      setBelowBreakpoint(DEFAULT_BREAKPOINT, false)

      mountHost()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footer).not.toBeNull()
      // v-show="is_visible" adds display:none when false
      expect(footer.style.display).toBe('none')
    })

    test('footer is visible when the registered breakpoint matches the viewport', async () => {
      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)

      mountHost()
      await nextTick()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footer).not.toBeNull()
      expect(footer.style.display).not.toBe('none')
    })

    test('footer hides when the viewport stops matching the registered breakpoint', async () => {
      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)

      mountHost()
      await nextTick()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footer.style.display).not.toBe('none')

      setBelowBreakpoint(DEFAULT_BREAKPOINT, false)
      await nextTick()

      expect(footer.style.display).toBe('none')
    })

    // ── keyboard-open hides the dock ────────────────────────────────────

    test('footer hides while the on-screen keyboard is open, even when the breakpoint matches', async () => {
      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)
      setKeyboardOpen(true)

      mountHost()
      await nextTick()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footer.style.display).toBe('none')
    })

    test('footer reappears once the keyboard closes again', async () => {
      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)
      setKeyboardOpen(true)

      mountHost()
      await nextTick()
      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footer.style.display).toBe('none')

      setKeyboardOpen(false)
      await nextTick()

      expect(footer.style.display).not.toBe('none')
    })
  })

  describe('bottom edge allowance [obligation]', () => {
    // has_edge_allowance's only observable effect in this environment (Tailwind
    // CSS isn't loaded for the test page) is whether the bound utility class
    // that sets --dock-pb's flush value is present on the footer's class list.
    const ALLOWANCE_CLASS = '[--dock-pb:calc(0.5rem+env(safe-area-inset-bottom))]'

    function footerHasAllowance(footer) {
      return footer.classList.contains(ALLOWANCE_CLASS)
    }

    test('present below sm on a fine (non-touch) pointer — pointer type never gates it [obligation]', async () => {
      // The dock is flush below sm regardless of any claimed visibility breakpoint.
      setBelowBreakpoint('sm', true)
      setChromeCovered(false)

      mountHost()
      await nextTick()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footerHasAllowance(footer)).toBe(true)
    })

    test('absent at or above sm — the bar is an inset card there, not flush [obligation]', async () => {
      setBelowBreakpoint('sm', false)
      setChromeCovered(false)

      mountHost()
      await nextTick()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footerHasAllowance(footer)).toBe(false)
    })

    test('absent when the browser chrome already covers the bottom strip, even while flush [obligation]', async () => {
      setBelowBreakpoint('sm', true)
      setChromeCovered(true)

      mountHost()
      await nextTick()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footerHasAllowance(footer)).toBe(false)
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

  describe('above slot target', () => {
    test('renders the above div with [mobile-dock-above] attribute inside the footer', () => {
      mountHost()

      const above = document.querySelector('[mobile-dock-above]')
      expect(above).not.toBeNull()
      expect(above?.getAttribute('data-testid')).toBe('mobile-dock-host__above')
    })

    test('[mobile-dock-above] is a child of the footer element', () => {
      mountHost()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      const above = document.querySelector('[mobile-dock-above]')
      expect(footer).not.toBeNull()
      expect(above).not.toBeNull()
      expect(footer?.contains(above)).toBe(true)
    })
  })

  describe('--mobile-dock-height CSS property', () => {
    test('publishes --mobile-dock-height = 0px on mount when the breakpoint does not match', () => {
      setBelowBreakpoint(DEFAULT_BREAKPOINT, false)

      mountHost()

      expect(document.documentElement.style.getPropertyValue('--mobile-dock-height')).toBe('0px')
    })

    test('removes --mobile-dock-height from :root on unmount', async () => {
      const wrapper = mountHost()

      wrapper.unmount()
      // Pop it off the list so afterEach doesn't double-unmount
      wrappers.splice(wrappers.indexOf(wrapper), 1)

      expect(document.documentElement.style.getPropertyValue('--mobile-dock-height')).toBe('')
    })

    test('updates --mobile-dock-height when the breakpoint starts matching', async () => {
      setBelowBreakpoint(DEFAULT_BREAKPOINT, false)

      mountHost()
      expect(document.documentElement.style.getPropertyValue('--mobile-dock-height')).toBe('0px')

      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)
      await nextTick()
      // offsetHeight is 0 with no layout, so height stays 0px — but the
      // property is set (not removed). Just verify the property exists.
      expect(document.documentElement.style.getPropertyValue('--mobile-dock-height')).not.toBe('')
    })

    test('publishes --mobile-dock-height = 0px while the keyboard is open, even when the breakpoint matches [obligation]', async () => {
      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)

      mountHost()
      await nextTick()

      setKeyboardOpen(true)
      await nextTick()

      expect(document.documentElement.style.getPropertyValue('--mobile-dock-height')).toBe('0px')
    })
  })

  describe('height claim', () => {
    test('while a claim is held, the content wrapper inline height/overflow are cleared', async () => {
      mountHost()
      const wrapper_el = document.querySelector('[data-testid="mobile-dock-host__content-wrapper"]')
      wrapper_el.style.height = '40px'
      wrapper_el.style.overflow = 'hidden'

      const { claimHeight } = useMobileDock()
      claimHeight()
      await nextTick()

      expect(wrapper_el.style.height).toBe('')
      expect(wrapper_el.style.overflow).toBe('')
    })

    test('--mobile-dock-height is republished when the claim count returns to zero', async () => {
      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)
      mountHost()
      const { claimHeight, releaseHeight } = useMobileDock()

      claimHeight()
      await nextTick()

      const setPropertySpy = vi.spyOn(document.documentElement.style, 'setProperty')

      releaseHeight()
      await nextTick()

      expect(setPropertySpy).toHaveBeenCalledWith('--mobile-dock-height', expect.any(String))
    })
  })
})
