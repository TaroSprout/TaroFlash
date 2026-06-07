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

// Slot-rendering stub so the pos tag's text is observable (auto-stubs drop slots).
const UiTagStub = {
  name: 'UiTag',
  setup(_props, { slots }) {
    return () => h('span', slots.default?.())
  }
}

function mountCard(props = {}) {
  return shallowMount(TermCard, {
    props: {
      term: '',
      sentence: '',
      target_lang: 'en',
      ...props
    },
    global: {
      stubs: { UiTag: UiTagStub },
      mocks: { $t: (key) => key }
    }
  })
}

import TermCard from '@/views/audio-reader/term-popover/term-card.vue'
import { EdgeFunctionError } from '@/api/lessons'

beforeEach(() => {
  mutateAsyncMock.mockReset()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TermCard', () => {
  describe('translation fetch on mount', () => {
    test('calls translate mutation with term + sentence + target_lang', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      mountCard({ term: '猫', sentence: '猫がいる', target_lang: 'en' })
      await flushPromises()

      expect(mutateAsyncMock).toHaveBeenCalledWith({
        term: '猫',
        sentence: '猫がいる',
        target_lang: 'en'
      })
    })

    test('does not call translate mutation with an empty term', async () => {
      mountCard({ term: '', sentence: '' })
      await flushPromises()
      expect(mutateAsyncMock).not.toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    test('shows term-card__loading while the mutation is pending', () => {
      // Never resolve — mutation stays pending
      mutateAsyncMock.mockReturnValueOnce(new Promise(() => {}))
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      expect(wrapper.find('[data-testid="term-card__loading"]').exists()).toBe(true)
    })

    test('hides term-card__loading after the mutation resolves', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()
      expect(wrapper.find('[data-testid="term-card__loading"]').exists()).toBe(false)
    })
  })

  describe('success state', () => {
    test('renders term-card__translation with the translated text', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-card__translation"]').text()).toContain('cat')
    })

    test('renders term-card__reading with the reading and a pos tag', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      const reading = wrapper.find('[data-testid="term-card__reading"]')
      expect(reading.exists()).toBe(true)
      expect(reading.text()).toContain('ねこ')
      expect(reading.text()).toContain('noun')
    })

    test('renders term-card__description with the description text', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      const desc = wrapper.find('[data-testid="term-card__description"]')
      expect(desc.exists()).toBe(true)
      expect(desc.text()).toContain('A small domesticated carnivorous mammal.')
    })

    test('hides term-card__error on success', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-card__error"]').exists()).toBe(false)
    })
  })

  describe('error state', () => {
    test('shows term-card__error when the mutation rejects with a generic error', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new Error('network error'))
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-card__error"]').exists()).toBe(true)
    })

    test('shows the generic error message for a non-EdgeFunctionError', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new Error('network error'))
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      // Component renders the translated string, not the key
      expect(wrapper.find('[data-testid="term-card__error"]').text()).toBe(
        "Couldn't translate that. Try again."
      )
    })

    test('shows the too-long message for EdgeFunctionError code "output_truncated"', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new EdgeFunctionError('output_truncated'))
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-card__error"]').text()).toBe(
        'That selection is too long. Try a shorter phrase.'
      )
    })

    test('shows the generic error message for other EdgeFunctionError codes', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new EdgeFunctionError('file_too_large'))
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-card__error"]').text()).toBe(
        "Couldn't translate that. Try again."
      )
    })

    test('does not render translation result on error', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new Error('fail'))
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-card__translation"]').exists()).toBe(false)
    })

    test('does not show term-card__loading on error', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new Error('fail'))
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-card__loading"]').exists()).toBe(false)
    })
  })

  describe('header', () => {
    test('renders the header with the term text', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-card__header"]').text()).toContain('猫')
    })

    test('emits close when the header close button is clicked', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      await wrapper.find('[data-testid="term-card__close"]').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })
})
