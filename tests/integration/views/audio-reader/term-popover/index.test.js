import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { h } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mutateAsyncMock } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn()
}))

vi.mock('@/api/lessons', () => ({
  useTranslateTermMutation: () => ({ mutateAsync: mutateAsyncMock }),
  EdgeFunctionError: class EdgeFunctionError extends Error {
    constructor(code) {
      super(code)
      this.name = 'EdgeFunctionError'
      this.code = code
    }
  }
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

const TRANSLATION_RESULT = {
  translation: 'cat',
  reading: 'ねこ',
  pos: 'noun',
  description: 'A small domesticated carnivorous mammal.'
}

// Stub UiPopover so the term-popover test stays focused on translation
// behaviour. The stub mirrors the real popover's open-gated rendering so the
// visibility assertions still exercise the `open` prop. A render function is
// used because the browser-mode build has no runtime template compiler.
const UiPopoverStub = {
  name: 'UiPopover',
  props: ['open'],
  setup(props, { slots }) {
    return () => (props.open ? h('div', slots.default?.()) : null)
  }
}

// Slot-rendering stub so the pos tag's text is observable (auto-stubs drop slots).
const UiTagStub = {
  name: 'UiTag',
  setup(_props, { slots }) {
    return () => h('span', slots.default?.())
  }
}

function mountPopover(props = {}) {
  return shallowMount(TermPopover, {
    props: {
      open: false,
      rect: null,
      term: '',
      sentence: '',
      target_lang: 'en',
      ...props
    },
    global: {
      stubs: { UiPopover: UiPopoverStub, UiTag: UiTagStub },
      mocks: { $t: (key) => key }
    }
  })
}

import TermPopover from '@/views/audio-reader/term-popover/index.vue'
import { EdgeFunctionError } from '@/api/lessons'

beforeEach(() => {
  mutateAsyncMock.mockReset()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TermPopover', () => {
  describe('visibility', () => {
    test('does not render the popover when open is false', () => {
      const wrapper = mountPopover({ open: false, term: '猫' })
      expect(wrapper.find('[data-testid="term-popover"]').exists()).toBe(false)
    })

    test('renders the popover when open is true', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountPopover({ open: true, term: '猫', sentence: '猫がいる' })
      await flushPromises()
      expect(wrapper.find('[data-testid="term-popover"]').exists()).toBe(true)
    })
  })

  describe('translation fetch on open', () => {
    test('calls translate mutation with term + sentence + target_lang when opened with a term', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      mountPopover({ open: true, term: '猫', sentence: '猫がいる', target_lang: 'en' })
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith({
        term: '猫',
        sentence: '猫がいる',
        target_lang: 'en'
      })
    })

    test('does not call translate mutation when opened with an empty term', async () => {
      mountPopover({ open: true, term: '', sentence: '' })
      await flushPromises()
      expect(mutateAsyncMock).not.toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    test('shows term-popover__loading while the mutation is pending', async () => {
      // Never resolve — mutation stays pending
      mutateAsyncMock.mockReturnValueOnce(new Promise(() => {}))
      const wrapper = mountPopover({ open: true, term: '猫', sentence: 'test' })
      // Don't await flushPromises — we want the pending state
      expect(wrapper.find('[data-testid="term-popover__loading"]').exists()).toBe(true)
    })

    test('hides term-popover__loading after the mutation resolves', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountPopover({ open: true, term: '猫', sentence: 'test' })
      await flushPromises()
      expect(wrapper.find('[data-testid="term-popover__loading"]').exists()).toBe(false)
    })
  })

  describe('success state', () => {
    test('renders term-popover__translation with the translated text', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountPopover({ open: true, term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-popover__translation"]').text()).toContain('cat')
    })

    test('renders term-popover__reading with the reading and a pos tag', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountPopover({ open: true, term: '猫', sentence: 'test' })
      await flushPromises()

      const reading = wrapper.find('[data-testid="term-popover__reading"]')
      expect(reading.exists()).toBe(true)
      expect(reading.text()).toContain('ねこ')
      expect(reading.text()).toContain('noun')
    })

    test('renders term-popover__description with the description text', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountPopover({ open: true, term: '猫', sentence: 'test' })
      await flushPromises()

      const desc = wrapper.find('[data-testid="term-popover__description"]')
      expect(desc.exists()).toBe(true)
      expect(desc.text()).toContain('A small domesticated carnivorous mammal.')
    })

    test('hides term-popover__error on success', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountPopover({ open: true, term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-popover__error"]').exists()).toBe(false)
    })
  })

  describe('error state', () => {
    test('shows term-popover__error when the mutation rejects with a generic error', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new Error('network error'))
      const wrapper = mountPopover({ open: true, term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-popover__error"]').exists()).toBe(true)
    })

    test('shows the generic error message for a non-EdgeFunctionError', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new Error('network error'))
      const wrapper = mountPopover({ open: true, term: '猫', sentence: 'test' })
      await flushPromises()

      // Component renders the translated string, not the key
      expect(wrapper.find('[data-testid="term-popover__error"]').text()).toBe(
        "Couldn't translate that. Try again."
      )
    })

    test('shows the too-long message for EdgeFunctionError code "output_truncated"', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new EdgeFunctionError('output_truncated'))
      const wrapper = mountPopover({ open: true, term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-popover__error"]').text()).toBe(
        'That selection is too long. Try a shorter phrase.'
      )
    })

    test('shows the generic error message for other EdgeFunctionError codes', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new EdgeFunctionError('file_too_large'))
      const wrapper = mountPopover({ open: true, term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-popover__error"]').text()).toBe(
        "Couldn't translate that. Try again."
      )
    })

    test('does not render translation result on error', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new Error('fail'))
      const wrapper = mountPopover({ open: true, term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-popover__translation"]').exists()).toBe(false)
    })

    test('does not show term-popover__loading on error', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new Error('fail'))
      const wrapper = mountPopover({ open: true, term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-popover__loading"]').exists()).toBe(false)
    })
  })

  describe('header', () => {
    test('renders the header with the term text', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountPopover({ open: true, term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-popover__header"]').text()).toContain('猫')
    })
  })
})
