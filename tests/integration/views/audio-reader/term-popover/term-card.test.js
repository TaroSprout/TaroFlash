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
  difficulty: 3,
  description: 'A small domesticated carnivorous mammal.'
}

// Slot-rendering stub; forwards $attrs so data-theme / data-theme-dark are assertable.
const UiTagStub = {
  name: 'UiTag',
  inheritAttrs: false,
  setup(_props, { slots, attrs }) {
    return () => h('span', { ...attrs }, slots.default?.())
  }
}

// Auto-stubs swallow click handlers; this one forwards them so the close button works.
const UiButtonStub = {
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_props, { slots, emit, attrs }) {
    return () => h('button', { ...attrs, onClick: () => emit('press') }, slots.default?.())
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
  props: ['front', 'back', 'note', 'deck_id'],
  emits: ['saved', 'cancel'],
  setup(props) {
    return () =>
      h('div', {
        'data-testid': 'add-card-panel-stub',
        'data-front': props.front,
        'data-back': props.back,
        'data-note': props.note
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

    test('add-card-panel back is translation + "\\n\\n" + reading when reading is present [obligation]', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      wrapper.findComponent(AddCardControlStub).vm.$emit('add', 7)
      await flushPromises()

      const panel = wrapper.find('[data-testid="add-card-panel-stub"]')
      expect(panel.attributes('data-front')).toBe('猫')
      expect(panel.attributes('data-back')).toBe('cat\n\nねこ')
    })

    test('add-card-panel back is just translation (no trailing blank lines) when reading is absent [obligation]', async () => {
      const no_reading_result = { translation: 'cat', reading: '', pos: 'noun', description: '' }
      mutateAsyncMock.mockResolvedValueOnce(no_reading_result)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      wrapper.findComponent(AddCardControlStub).vm.$emit('add', 7)
      await flushPromises()

      const panel = wrapper.find('[data-testid="add-card-panel-stub"]')
      expect(panel.attributes('data-back')).toBe('cat')
    })

    test('panel saved slides back to term card and does NOT emit close [obligation]', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      wrapper.findComponent(AddCardControlStub).vm.$emit('add', 7)
      await flushPromises()
      wrapper.findComponent(AddCardPanelStub).vm.$emit('saved')
      await flushPromises()

      // Panel unmounts (term face restored), but close is NOT emitted
      expect(wrapper.find('[data-testid="add-card-panel-stub"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="term-card__face"]').exists()).toBe(true)
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    test('panel cancel slides back to term card and does NOT emit close [obligation]', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      wrapper.findComponent(AddCardControlStub).vm.$emit('add', 7)
      await flushPromises()
      wrapper.findComponent(AddCardPanelStub).vm.$emit('cancel')
      await flushPromises()

      expect(wrapper.find('[data-testid="add-card-panel-stub"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="term-card__face"]').exists()).toBe(true)
      expect(wrapper.emitted('close')).toBeFalsy()
    })

    test('panel cancel is handled by the shared returnToTermCard handler', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      wrapper.findComponent(AddCardControlStub).vm.$emit('add', 7)
      await flushPromises()
      expect(wrapper.find('[data-testid="add-card-panel-stub"]').exists()).toBe(true)

      wrapper.findComponent(AddCardPanelStub).vm.$emit('cancel')
      await flushPromises()

      // Face is restored; panel is gone (same returnToTermCard behaviour as saved)
      expect(wrapper.find('[data-testid="add-card-panel-stub"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="term-card__face"]').exists()).toBe(true)
    })

    test('add-card-panel receives description as note from the translation result [obligation]', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()

      wrapper.findComponent(AddCardControlStub).vm.$emit('add', 7)
      await flushPromises()

      const panel = wrapper.find('[data-testid="add-card-panel-stub"]')
      expect(panel.attributes('data-note')).toBe(TRANSLATION_RESULT.description)
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

  describe('show_back mode events', () => {
    test('clicking term-card__back in show_back mode emits back', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test', show_back: true })
      await flushPromises()

      await wrapper.find('[data-testid="term-card__back"]').trigger('click')

      expect(wrapper.emitted('back')).toBeTruthy()
    })
  })

  describe('play actions', () => {
    test('clicking term-card__play-word emits play-word', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test', show_back: false })
      await flushPromises()

      await wrapper.find('[data-testid="term-card__play-word"]').trigger('click')

      expect(wrapper.emitted('play-word')).toBeTruthy()
    })

    test('clicking term-card__play-from-here emits play-from-here', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test', show_back: false })
      await flushPromises()

      await wrapper.find('[data-testid="term-card__play-from-here"]').trigger('click')

      expect(wrapper.emitted('play-from-here')).toBeTruthy()
    })

    test('play-word button is NOT rendered when show_back=true', async () => {
      mutateAsyncMock.mockResolvedValueOnce(TRANSLATION_RESULT)
      const wrapper = mountCard({ term: '猫', sentence: 'test', show_back: true })
      await flushPromises()

      expect(wrapper.find('[data-testid="term-card__play-word"]').exists()).toBe(false)
    })
  })

  describe('difficulty_tier tag [obligation]', () => {
    // Helper to mount and resolve with a specific difficulty score.
    async function mountWithDifficulty(difficulty) {
      mutateAsyncMock.mockResolvedValueOnce({ ...TRANSLATION_RESULT, difficulty })
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()
      return wrapper
    }

    test('ui-tag is NOT rendered when result is null (no translation yet) [obligation]', () => {
      mutateAsyncMock.mockReturnValueOnce(new Promise(() => {}))
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      expect(wrapper.findComponent(UiTagStub).exists()).toBe(false)
    })

    test('ui-tag is NOT rendered when result has no difficulty field [obligation]', async () => {
      mutateAsyncMock.mockResolvedValueOnce({
        translation: 'cat',
        reading: 'ねこ',
        description: 'A cat.'
        // no difficulty key
      })
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()
      expect(wrapper.findComponent(UiTagStub).exists()).toBe(false)
    })

    test('ui-tag is NOT rendered when difficulty is null [obligation]', async () => {
      mutateAsyncMock.mockResolvedValueOnce({ ...TRANSLATION_RESULT, difficulty: null })
      const wrapper = mountCard({ term: '猫', sentence: 'test' })
      await flushPromises()
      expect(wrapper.findComponent(UiTagStub).exists()).toBe(false)
    })

    // Exact tier boundary: score 2 → beginner (max: 2) [obligation]
    test('score 2 → beginner tier — data-theme green-400, data-theme-dark green-600 [obligation]', async () => {
      const wrapper = await mountWithDifficulty(2)
      const tag = wrapper.findComponent(UiTagStub)
      expect(tag.exists()).toBe(true)
      expect(tag.attributes('data-theme')).toBe('green-400')
      expect(tag.attributes('data-theme-dark')).toBe('green-600')
    })

    // Score 3 → elementary (max: 4) [obligation]
    test('score 3 → elementary tier — data-theme green-400, data-theme-dark green-600 [obligation]', async () => {
      const wrapper = await mountWithDifficulty(3)
      const tag = wrapper.findComponent(UiTagStub)
      expect(tag.exists()).toBe(true)
      expect(tag.attributes('data-theme')).toBe('green-400')
      expect(tag.attributes('data-theme-dark')).toBe('green-600')
    })

    // Score 1 and score 4 share green theme [obligation]
    test('score 1 → data-theme green-400, data-theme-dark green-600 (same as score 4) [obligation]', async () => {
      const wrapper = await mountWithDifficulty(1)
      const tag = wrapper.findComponent(UiTagStub)
      expect(tag.attributes('data-theme')).toBe('green-400')
      expect(tag.attributes('data-theme-dark')).toBe('green-600')
    })

    test('score 4 → data-theme green-400, data-theme-dark green-600 (same as score 1) [obligation]', async () => {
      const wrapper = await mountWithDifficulty(4)
      const tag = wrapper.findComponent(UiTagStub)
      expect(tag.attributes('data-theme')).toBe('green-400')
      expect(tag.attributes('data-theme-dark')).toBe('green-600')
    })

    // Score 6 → intermediate (max: 6) [obligation]
    test('score 6 → intermediate tier — data-theme yellow-500, data-theme-dark yellow-700 [obligation]', async () => {
      const wrapper = await mountWithDifficulty(6)
      const tag = wrapper.findComponent(UiTagStub)
      expect(tag.exists()).toBe(true)
      expect(tag.attributes('data-theme')).toBe('yellow-500')
      expect(tag.attributes('data-theme-dark')).toBe('yellow-700')
    })

    // Score 8 → advanced (max: 8) [obligation]
    test('score 8 → advanced tier — data-theme red-500, data-theme-dark red-600 [obligation]', async () => {
      const wrapper = await mountWithDifficulty(8)
      const tag = wrapper.findComponent(UiTagStub)
      expect(tag.exists()).toBe(true)
      expect(tag.attributes('data-theme')).toBe('red-500')
      expect(tag.attributes('data-theme-dark')).toBe('red-600')
    })

    // Score 9 → expert (max: 10) [obligation]
    test('score 9 → expert tier — data-theme red-500, data-theme-dark red-600 [obligation]', async () => {
      const wrapper = await mountWithDifficulty(9)
      const tag = wrapper.findComponent(UiTagStub)
      expect(tag.exists()).toBe(true)
      expect(tag.attributes('data-theme')).toBe('red-500')
      expect(tag.attributes('data-theme-dark')).toBe('red-600')
    })

    // Score 8 and score 9 share red theme [obligation]
    test('score 8 and score 9 both produce red-500 / red-600 [obligation]', async () => {
      const w8 = await mountWithDifficulty(8)
      const w9 = await mountWithDifficulty(9)
      expect(w8.findComponent(UiTagStub).attributes('data-theme')).toBe(
        w9.findComponent(UiTagStub).attributes('data-theme')
      )
      expect(w8.findComponent(UiTagStub).attributes('data-theme-dark')).toBe(
        w9.findComponent(UiTagStub).attributes('data-theme-dark')
      )
    })

    // Score 10 → expert (max: 10) [obligation]
    test('score 10 → expert tier — data-theme red-500, data-theme-dark red-600 [obligation]', async () => {
      const wrapper = await mountWithDifficulty(10)
      const tag = wrapper.findComponent(UiTagStub)
      expect(tag.exists()).toBe(true)
      expect(tag.attributes('data-theme')).toBe('red-500')
      expect(tag.attributes('data-theme-dark')).toBe('red-600')
    })

    // Fallback to last tier (expert) for scores > 10 [obligation]
    test('score > 10 falls back to expert tier via DIFFICULTY_TIERS.at(-1) [obligation]', async () => {
      const wrapper = await mountWithDifficulty(15)
      const tag = wrapper.findComponent(UiTagStub)
      expect(tag.exists()).toBe(true)
      expect(tag.attributes('data-theme')).toBe('red-500')
      expect(tag.attributes('data-theme-dark')).toBe('red-600')
    })

    // POS tag removed — difficulty_tier renders the difficulty label, not result.pos [obligation]
    test('renders the translated difficulty label in the tag, not a raw pos string [obligation]', async () => {
      const wrapper = await mountWithDifficulty(3)
      const tag = wrapper.findComponent(UiTagStub)
      // Real i18n is active in browser mode; score 3 → elementary tier → "Elementary".
      expect(tag.text()).toBe('Elementary')
    })
  })
})
