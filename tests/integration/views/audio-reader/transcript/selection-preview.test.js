import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import SelectionPreview from '@/views/audio-reader/transcript/selection-preview.vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockGsapSet, mockFromTo, mockTo } = vi.hoisted(() => ({
  mockGsapSet: vi.fn(),
  mockFromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
  mockTo: vi.fn((_el, opts) => opts?.onComplete?.())
}))

vi.mock('gsap', () => ({
  default: {
    set: mockGsapSet,
    fromTo: mockFromTo,
    to: mockTo
  }
}))

vi.mock('@/utils/animations/selection-preview', () => ({
  popInPreview: vi.fn((_el, onComplete) => onComplete?.()),
  popOutPreview: vi.fn((_el, onComplete) => onComplete?.())
}))

import { popInPreview, popOutPreview } from '@/utils/animations/selection-preview'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePreview(overrides = {}) {
  return {
    text: 'Hello world',
    x: 150,
    top: 200,
    bottom: 224,
    ...overrides
  }
}

function mountPreview(props = {}) {
  return mount(SelectionPreview, {
    props: { preview: null, ...props },
    attachTo: document.body
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('SelectionPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up any lingering Teleport portals attached to body
    document.querySelectorAll('[data-testid="selection-preview"]').forEach((el) => el.remove())
  })

  describe('rendering', () => {
    test('renders the bubble element in the document (teleported to body)', () => {
      mountPreview()

      // Teleport to body — must be queryable from document
      expect(document.querySelector('[data-testid="selection-preview"]')).not.toBeNull()
    })

    test('bubble is permanently mounted regardless of preview prop', () => {
      const wrapper = mountPreview({ preview: null })

      expect(document.querySelector('[data-testid="selection-preview"]')).not.toBeNull()

      wrapper.unmount()
    })

    test('data-visible is false when preview is null', async () => {
      mountPreview({ preview: null })

      const el = document.querySelector('[data-testid="selection-preview"]')
      expect(el.getAttribute('data-visible')).toBe('false')
    })

    test('data-visible is true when preview is non-null', async () => {
      const wrapper = mountPreview({ preview: null })
      await wrapper.setProps({ preview: makePreview() })

      const el = document.querySelector('[data-testid="selection-preview"]')
      expect(el.getAttribute('data-visible')).toBe('true')
    })

    test('renders the preview text in the bubble when shown', async () => {
      const wrapper = mountPreview({ preview: null })
      await wrapper.setProps({ preview: makePreview({ text: '日本語' }) })

      const el = document.querySelector('[data-testid="selection-preview"]')
      expect(el.textContent.trim()).toBe('日本語')
    })

    test('bubble is aria-hidden', () => {
      mountPreview()

      const el = document.querySelector('[data-testid="selection-preview"]')
      expect(el.getAttribute('aria-hidden')).toBe('true')
    })
  })

  describe('data-below positioning flag', () => {
    test('data-below is false when preview.top is above FLIP_BELOW_Y (112px)', async () => {
      const wrapper = mountPreview({ preview: makePreview({ top: 200 }) })
      await wrapper.vm.$nextTick()

      const el = document.querySelector('[data-testid="selection-preview"]')
      expect(el.getAttribute('data-below')).toBe('false')
    })

    test('data-below is true when preview.top is below FLIP_BELOW_Y (112px)', async () => {
      const wrapper = mountPreview({ preview: null })
      await wrapper.setProps({ preview: makePreview({ top: 50 }) })

      const el = document.querySelector('[data-testid="selection-preview"]')
      expect(el.getAttribute('data-below')).toBe('true')
    })

    test('data-below is false when preview is null', () => {
      mountPreview({ preview: null })

      const el = document.querySelector('[data-testid="selection-preview"]')
      expect(el.getAttribute('data-below')).toBe('false')
    })
  })

  describe('animation: popInPreview called on first appearance', () => {
    test('popInPreview is called when preview transitions from null to non-null', async () => {
      const wrapper = mountPreview({ preview: null })
      await wrapper.vm.$nextTick()

      await wrapper.setProps({ preview: makePreview() })

      expect(popInPreview).toHaveBeenCalledTimes(1)
    })

    test('popInPreview is NOT called again when dragging updates an already-shown preview', async () => {
      const wrapper = mountPreview({ preview: makePreview({ x: 100 }) })
      await wrapper.vm.$nextTick()
      vi.clearAllMocks()

      // Update x — preview was already non-null, so no re-pop
      await wrapper.setProps({ preview: makePreview({ x: 120 }) })

      expect(popInPreview).not.toHaveBeenCalled()
    })
  })

  describe('animation: popOutPreview called on disappearance', () => {
    test('popOutPreview is called when preview transitions from non-null to null', async () => {
      const wrapper = mountPreview({ preview: makePreview() })
      await wrapper.vm.$nextTick()
      vi.clearAllMocks()

      await wrapper.setProps({ preview: null })

      expect(popOutPreview).toHaveBeenCalledTimes(1)
    })

    test('shown text is cleared after popOutPreview onComplete fires', async () => {
      // popOutPreview mock calls onComplete immediately — so shown.value clears synchronously
      const wrapper = mountPreview({ preview: makePreview({ text: '選択' }) })
      await wrapper.vm.$nextTick()

      await wrapper.setProps({ preview: null })
      await wrapper.vm.$nextTick()

      const el = document.querySelector('[data-testid="selection-preview"]')
      expect(el.getAttribute('data-visible')).toBe('false')
    })
  })

  describe('shown text is retained through fade-out (no flicker)', () => {
    test('when popOutPreview has not yet called onComplete, shown text is still present', async () => {
      // Override mock to NOT call onComplete immediately for this test
      popOutPreview.mockImplementationOnce(vi.fn())

      const wrapper = mountPreview({ preview: null })
      // Arm: transition null → non-null so the watcher fires and shown is set
      await wrapper.setProps({ preview: makePreview({ text: '日本語' }) })

      await wrapper.setProps({ preview: null })
      await wrapper.vm.$nextTick()

      const el = document.querySelector('[data-testid="selection-preview"]')
      // data-visible stays true until onComplete fires
      expect(el.getAttribute('data-visible')).toBe('true')
      expect(el.textContent.trim()).toBe('日本語')
    })
  })
})
