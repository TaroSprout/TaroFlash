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

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((_el, _from, to) => to?.onComplete?.()),
    to: vi.fn((_el, opts) => opts?.onComplete?.())
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

// Auto-stubs swallow click handlers; this one forwards them so the close button works.
const UiButtonStub = {
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['click'],
  setup(_props, { slots, emit, attrs }) {
    return () => h('button', { ...attrs, onClick: () => emit('click') }, slots.default?.())
  }
}

// The add control fetches decks of its own; stub it and drive its `add` event.
const AddCardControlStub = {
  name: 'AddCardControl',
  props: ['disabled'],
  emits: ['add'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'add-card-control-stub',
        'data-disabled': props.disabled || undefined
      })
  }
}

// Stub the panel so we can drive its saved/cancel events without real save logic.
const AddCardPanelStub = {
  name: 'AddCardPanel',
  props: ['front', 'back', 'deck_id'],
  emits: ['saved', 'cancel'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'add-card-panel-stub',
        'data-front': props.front,
        'data-back': props.back
      })
  }
}

const UiDividerStub = {
  name: 'UiDivider',
  setup(_props, { slots }) {
    return () => h('div', { 'data-testid': 'ui-divider-stub' }, [slots.start?.(), slots.end?.()])
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
      stubs: {
        UiTag: UiTagStub,
        UiButton: UiButtonStub,
        AddCardControl: AddCardControlStub,
        AddCardPanel: AddCardPanelStub,
        UiDivider: UiDividerStub
      },
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

    test('renders term-card__reading with the reading text', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      const reading = wrapper.find('[data-testid="term-card__reading"]')
      expect(reading.exists()).toBe(true)
      expect(reading.text()).toContain('ねこ')
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

    test('shows a different error message for EdgeFunctionError code "output_truncated"', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new EdgeFunctionError('output_truncated'))
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      // The too-long error key renders a different message than the generic error key.
      // We assert both errors exist and are different from each other.
      const tooLongText = wrapper.find('[data-testid="term-card__error"]').text()
      expect(tooLongText).toBeTruthy()

      // Now verify generic error shows different text
      mutateAsyncMock.mockRejectedValueOnce(new EdgeFunctionError('file_too_large'))
      const wrapper2 = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()
      const genericText = wrapper2.find('[data-testid="term-card__error"]').text()

      expect(tooLongText).not.toBe(genericText)
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

    // The close button renders only when !show_back && !result (loading / error, desktop).
    test('emits close when the header close button is clicked in the error state', async () => {
      mutateAsyncMock.mockRejectedValueOnce(new Error('fail'))
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      await wrapper.find('[data-testid="term-card__close"]').trigger('click')

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    test('close button is hidden once a translation loads (show_back=false)', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test', show_back: false })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-card__close"]').exists()).toBe(false)
    })
  })

  describe('add-card-control visibility [obligation]', () => {
    test('add-card-control is rendered once translation loads (show_back=false)', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test', show_back: false })
      await flushPromises()

      expect(wrapper.findComponent(AddCardControlStub).exists()).toBe(true)
    })

    test('add-card-control is rendered in the show_back controls row', () => {
      mutateAsyncMock.mockReturnValueOnce(new Promise(() => {}))
      const wrapper = mountCard({ term: '猫', sentence: 'test', show_back: true })

      // Controls row always present when show_back=true
      expect(wrapper.find('[data-testid="term-card__controls"]').exists()).toBe(true)
      expect(wrapper.findComponent(AddCardControlStub).exists()).toBe(true)
    })

    test('add-card-control in show_back row is disabled while result is null (loading) [obligation]', () => {
      mutateAsyncMock.mockReturnValueOnce(new Promise(() => {}))
      const wrapper = mountCard({ term: '猫', sentence: 'test', show_back: true })

      expect(wrapper.findComponent(AddCardControlStub).props('disabled')).toBe(true)
    })

    test('add-card-control in show_back row is enabled after translation loads [obligation]', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test', show_back: true })
      await flushPromises()

      expect(wrapper.findComponent(AddCardControlStub).props('disabled')).toBe(false)
    })
  })

  describe('add card inline panel [obligation]', () => {
    test('onAddCard sets the adding draft and shows AddCardPanel instead of the face', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      wrapper.findComponent(AddCardControlStub).vm.$emit('add', 7)
      await flushPromises()

      // Panel is now shown, face is gone
      expect(wrapper.find('[data-testid="add-card-panel-stub"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="term-card__face"]').exists()).toBe(false)
    })

    test('add-card-panel receives front = term and back = translation', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      wrapper.findComponent(AddCardControlStub).vm.$emit('add', 7)
      await flushPromises()

      const panel = wrapper.find('[data-testid="add-card-panel-stub"]')
      expect(panel.attributes('data-front')).toBe('猫')
      expect(panel.attributes('data-back')).toBe('cat')
    })

    test('panel saved emits close from term-card [obligation]', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      wrapper.findComponent(AddCardControlStub).vm.$emit('add', 7)
      await flushPromises()
      wrapper.findComponent(AddCardPanelStub).vm.$emit('saved')
      await flushPromises()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    test('panel cancel clears adding and restores the translation face [obligation]', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      wrapper.findComponent(AddCardControlStub).vm.$emit('add', 7)
      await flushPromises()
      expect(wrapper.find('[data-testid="add-card-panel-stub"]').exists()).toBe(true)

      wrapper.findComponent(AddCardPanelStub).vm.$emit('cancel')
      await flushPromises()

      // Face is restored; panel is gone
      expect(wrapper.find('[data-testid="add-card-panel-stub"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="term-card__face"]').exists()).toBe(true)
    })

    test('onAddCard does nothing when result is null (no translation yet) [obligation]', async () => {
      // Use show_back=true so the add-card-control is always present in the controls row.
      // Mutation never resolves — result stays null.
      mutateAsyncMock.mockReturnValueOnce(new Promise(() => {}))
      const wrapper = mountCard({ term: '猫', sentence: 'test', show_back: true })

      wrapper.findComponent(AddCardControlStub).vm.$emit('add', 7)
      await flushPromises()

      // Panel should NOT appear — guard bails when result is null
      expect(wrapper.find('[data-testid="add-card-panel-stub"]').exists()).toBe(false)
    })

    test('term-card does NOT emit close immediately on add-card event [obligation]', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      wrapper.findComponent(AddCardControlStub).vm.$emit('add', 7)
      await flushPromises()

      // close is NOT emitted until panel fires saved
      expect(wrapper.emitted('close')).toBeFalsy()
    })
  })
})
