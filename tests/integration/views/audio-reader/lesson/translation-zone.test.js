import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

const { mockEnter, mockLeave, useStageHeightMock } = vi.hoisted(() => ({
  mockEnter: vi.fn((_el, done) => done()),
  mockLeave: vi.fn((_el, done) => done()),
  useStageHeightMock: vi.fn(() => ({ claimHeight: vi.fn(() => vi.fn()) }))
}))

vi.mock('@/utils/animations/translation-crossfade', () => ({
  translationCrossfadeEnter: mockEnter,
  translationCrossfadeLeave: mockLeave
}))

vi.mock('@/components/layout-kit/stage/use-stage-height', () => ({
  useStageHeight: useStageHeightMock
}))

import TranslationZone from '@/views/audio-reader/lesson/translation-zone.vue'

describe('TranslationZone', () => {
  beforeEach(() => {
    mockEnter.mockClear()
    mockLeave.mockClear()
    useStageHeightMock.mockClear()
  })

  describe('empty on null', () => {
    test('renders no text when translation is null', () => {
      const wrapper = mount(TranslationZone, { props: { translation: null } })
      expect(wrapper.find('[data-testid="translation-zone__text"]').exists()).toBe(false)
    })

    test('renders no text when translation is omitted', () => {
      const wrapper = mount(TranslationZone)
      expect(wrapper.find('[data-testid="translation-zone__text"]').exists()).toBe(false)
    })

    test('renders the translation text when set', () => {
      const wrapper = mount(TranslationZone, { props: { translation: 'Bonjour.' } })
      expect(wrapper.find('[data-testid="translation-zone__text"]').text()).toBe('Bonjour.')
    })

    test('clearing a translation back to null removes the text', async () => {
      const wrapper = mount(TranslationZone, { props: { translation: 'Bonjour.' } })
      await wrapper.setProps({ translation: null })
      expect(wrapper.find('[data-testid="translation-zone__text"]').exists()).toBe(false)
    })
  })

  describe('crossfade keying', () => {
    // Vue Test Utils stubs <transition> by default, which would skip the real
    // enter/leave hooks entirely — disable that stub so the keyed swap is
    // actually exercised.
    function mountUnstubbed(props = {}) {
      return mount(TranslationZone, {
        props,
        global: { stubs: { transition: false } }
      })
    }

    test('a changed translation is keyed so the transition treats it as a new node', async () => {
      const wrapper = mountUnstubbed({ translation: 'Bonjour.' })
      mockEnter.mockClear()

      await wrapper.setProps({ translation: 'Salut.' })
      await flushPromises()
      await nextTick()

      // A distinct :key retires the old node and mounts a new one — both the
      // leave (old text) and enter (new text) transitions fire.
      expect(mockLeave).toHaveBeenCalled()
      expect(mockEnter).toHaveBeenCalled()
      expect(wrapper.find('[data-testid="translation-zone__text"]').text()).toBe('Salut.')
    })

    test('an unchanged translation does not retrigger the enter transition', async () => {
      const wrapper = mountUnstubbed({ translation: 'Bonjour.' })
      mockEnter.mockClear()

      await wrapper.setProps({ translation: 'Bonjour.' })

      expect(mockEnter).not.toHaveBeenCalled()
    })
  })

  describe('height wiring', () => {
    test('follows the band height through the stage, tying the wrapper and body elements', () => {
      const wrapper = mount(TranslationZone, { props: { translation: 'Bonjour.' } })

      expect(useStageHeightMock).toHaveBeenCalledTimes(1)
      const [boxRef, contentRef] = useStageHeightMock.mock.calls[0]

      expect(boxRef.value).toBe(wrapper.find('[data-testid="translation-zone"]').element)
      expect(contentRef.value).toBe(wrapper.find('[data-testid="translation-zone__body"]').element)
    })
  })
})
