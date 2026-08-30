import { describe, test, expect, beforeEach, afterEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { DEFAULT_BREAKPOINT, useMobileDock } from '@/components/mobile-dock/use-mobile-dock'
import MobileDockHost from '@/components/mobile-dock/mobile-dock-host.vue'
import { setBelowBreakpoint, resetBreakpointMedia } from '../../../helpers/breakpoint-media-mock'
import { setKeyboardOpen } from '../../../helpers/keyboard-open-mock'
import { setChromeCovered } from '../../../helpers/chrome-cover-mock'

// The footer's v-show is wrapped in a Transition delegating to these — mock them
// so the enter/leave wiring is observable without waiting on a real GSAP tween.
// Each auto-resolves its `done` callback so every existing display-toggle
// assertion below keeps working; a test that needs to hold the leave open
// overrides the implementation for that one call.
const { mockDockSlideIn, mockDockSlideOut } = vi.hoisted(() => ({
  mockDockSlideIn: vi.fn((_el, done) => done()),
  mockDockSlideOut: vi.fn((_el, done) => done())
}))

vi.mock('@/utils/animations/dock-slide', () => ({
  dockSlideIn: mockDockSlideIn,
  dockSlideOut: mockDockSlideOut
}))

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
  // @vue/test-utils stubs <Transition> by default (renders the slot straight
  // through, skipping enter/leave hooks entirely) — turn that off so the
  // footer's real slide wiring runs.
  const wrapper = mount(MobileDockHost, {
    attachTo: document.body,
    global: { stubs: { transition: false } }
  })
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
  mockDockSlideIn.mockClear()
  mockDockSlideOut.mockClear()

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
    // Derive the applied --dock-pb from the footer's *actual rendered class list*
    // rather than a copied literal — a literal survives editing the source back
    // to match it (this exact thing happened mid-branch: b6e05208 dropped the
    // floor, cc748bea "fixed" the test by editing the literal to match). Reading
    // structural properties off the real class tokens means an unfloored
    // `calc(0.5rem + env(safe-area-inset-bottom))` fails this test outright —
    // there is no literal to quietly update to make it pass again.
    const remValue = (text) => {
      const match = text?.match(/(\d+(?:\.\d+)?)rem/)
      return match ? Number.parseFloat(match[1]) : undefined
    }

    /** The `--dock-*` custom-property tokens the footer is actually rendering right now. */
    function dockPaddingTokens(footer) {
      const tokens = Array.from(footer.classList)
      return {
        top: tokens.filter((c) => c.startsWith('[--dock-pt:')),
        bottom: tokens.filter((c) => c.startsWith('[--dock-pb:'))
      }
    }

    // A floor is a bare rem term at the *top level* of the value — one not wrapped
    // in calc(), since a calc() term built on env(safe-area-inset-bottom) collapses
    // to nothing on a browser reporting a zero inset. Stripping calc() first is what
    // makes an unfloored value read as "no floor" rather than as its own 0.5rem term.
    const floorRem = (token) => {
      const value = token?.match(/^\[--dock-pb:(.+)\]$/)?.[1]
      return value === undefined ? undefined : remValue(value.replace(/calc\([^)]*\)/g, ''))
    }

    test("present below sm and floored at least to the bar's own top padding — pointer type never gates it, and the floor survives a zero device inset [obligation]", async () => {
      // Read the un-flush render first so the floating-card padding the flush state
      // must beat comes from the component itself, not from a literal copied out of
      // the source. A literal is what failed here before: b6e05208 dropped the floor
      // and cc748bea "fixed" the test by editing its literal to match.
      setBelowBreakpoint('sm', false)
      setChromeCovered(false)

      mountHost()
      await nextTick()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      const inset_card = dockPaddingTokens(footer)
      expect(inset_card.bottom).toHaveLength(1)
      const card_padding_rem = remValue(inset_card.bottom[0])
      const bar_top_padding_rem = remValue(inset_card.top[0])

      // The dock is flush below sm regardless of any claimed visibility breakpoint.
      setBelowBreakpoint('sm', true)
      await nextTick()

      const flush = dockPaddingTokens(footer)
      const allowance = flush.bottom.find((c) => !inset_card.bottom.includes(c))

      // Going flush adds an allowance on top of the card padding...
      expect(allowance).toBeDefined()
      // ...it is floored, not a bare calc() that vanishes at a zero device inset...
      expect(floorRem(allowance)).toBeDefined()
      // ...the floor clears the bar's own top padding...
      expect(floorRem(allowance)).toBeGreaterThanOrEqual(bar_top_padding_rem)
      // ...and is strictly more than the card padding it would otherwise collapse to.
      expect(floorRem(allowance)).toBeGreaterThan(card_padding_rem)
    })

    test('absent at or above sm — the bar is an inset card there, not flush [obligation]', async () => {
      setBelowBreakpoint('sm', false)
      setChromeCovered(false)

      mountHost()
      await nextTick()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      // Exactly the one static card-padding token — no allowance of any shape.
      expect(dockPaddingTokens(footer).bottom).toHaveLength(1)
    })

    test('absent when the browser chrome already covers the bottom strip, even while flush [obligation]', async () => {
      setBelowBreakpoint('sm', true)
      setChromeCovered(true)

      mountHost()
      await nextTick()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(dockPaddingTokens(footer).bottom).toHaveLength(1)
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

  describe('slide transition [obligation]', () => {
    test('dockSlideIn fires when the footer transitions from hidden to visible [obligation]', async () => {
      setBelowBreakpoint(DEFAULT_BREAKPOINT, false)
      mountHost()
      await nextTick()

      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)
      await nextTick()

      expect(mockDockSlideIn).toHaveBeenCalled()
      expect(mockDockSlideOut).not.toHaveBeenCalled()
    })

    test('dockSlideOut fires when the footer transitions from visible to hidden [obligation]', async () => {
      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)
      mountHost()
      await nextTick()

      setBelowBreakpoint(DEFAULT_BREAKPOINT, false)
      await nextTick()

      expect(mockDockSlideOut).toHaveBeenCalled()
    })

    test('dockSlideOut fires when the on-screen keyboard opens and hides the dock [obligation]', async () => {
      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)
      mountHost()
      await nextTick()

      setKeyboardOpen(true)
      await nextTick()

      expect(mockDockSlideOut).toHaveBeenCalled()
    })

    test("footer keeps its display until the leave transition's done callback fires [obligation]", async () => {
      let captured_done
      mockDockSlideOut.mockImplementationOnce((_el, done) => {
        captured_done = done
      })

      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)
      mountHost()
      await nextTick()

      setBelowBreakpoint(DEFAULT_BREAKPOINT, false)
      await nextTick()

      const footer = document.querySelector('[data-testid="mobile-dock-host"]')
      expect(footer.style.display).not.toBe('none')

      captured_done()
      await nextTick()

      expect(footer.style.display).toBe('none')
    })
  })

  describe('content-height tween [obligation]', () => {
    let captured_resize_cb
    let original_resize_observer

    beforeEach(() => {
      original_resize_observer = window.ResizeObserver
      window.ResizeObserver = class {
        constructor(cb) {
          captured_resize_cb = cb
        }
        observe() {}
        disconnect() {}
      }
    })

    afterEach(() => {
      window.ResizeObserver = original_resize_observer
    })

    test('content growing while is_visible stays true still tweens the wrapper height [obligation]', async () => {
      setBelowBreakpoint(DEFAULT_BREAKPOINT, true)
      mountHost()
      await nextTick()

      const content = document.querySelector('[data-testid="mobile-dock-host__content"]')
      const grown = document.createElement('div')
      grown.style.height = '80px'
      content.appendChild(grown)
      captured_resize_cb()

      // The animate-mode height tween sets overflow: hidden on the wrapper for
      // the duration of the tween — a separate tween from the bar's own slide,
      // and it must still fire while the bar itself stays visible throughout.
      const content_wrapper = document.querySelector(
        '[data-testid="mobile-dock-host__content-wrapper"]'
      )
      expect(content_wrapper.style.overflow).toBe('hidden')
    })
  })
})
