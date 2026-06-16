import { describe, test, expect, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { useMobileDock } from '@/components/mobile-dock/use-mobile-dock'
import MobileDockHost from '@/components/mobile-dock/mobile-dock-host.vue'

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
  })

  describe('content slot target', () => {
    test('renders the inner content div with [mobile-dock-content] attribute', async () => {
      mountHost()

      const content = document.querySelector('[mobile-dock-content]')
      expect(content).not.toBeNull()
      expect(content?.getAttribute('data-testid')).toBe('mobile-dock-host__content')
    })
  })
})
