import '@/styles/main.css'
import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'

const { mockSetBand, mockResizeBand } = vi.hoisted(() => ({
  mockSetBand: vi.fn(),
  mockResizeBand: vi.fn()
}))

vi.mock('@/utils/animations/reader-band', () => ({
  setBand: mockSetBand,
  resizeBand: mockResizeBand
}))

import TranslationBand from '@/views/reader/translation-band.vue'

function mountBand(props = {}) {
  return mount(TranslationBand, {
    props: { height: 80, translation: null, ...props },
    attachTo: document.body
  })
}

describe('TranslationBand', () => {
  beforeEach(() => {
    mockSetBand.mockClear()
    mockResizeBand.mockClear()
  })

  test('renders the translation text', () => {
    const wrapper = mountBand({ translation: 'hello world' })

    expect(wrapper.find('[data-testid="reader-band__text"]').text()).toBe('hello world')
  })

  test('seeds the band height on mount via setBand', () => {
    mountBand({ height: 42 })

    expect(mockSetBand).toHaveBeenCalledWith(expect.any(HTMLElement), 42)
    expect(mockResizeBand).not.toHaveBeenCalled()
  })

  test('tweens to a new height via resizeBand after mount', async () => {
    const wrapper = mountBand({ height: 42 })
    mockSetBand.mockClear()

    await wrapper.setProps({ height: 100 })

    expect(mockResizeBand).toHaveBeenCalledWith(expect.any(HTMLElement), 100)
    expect(mockSetBand).not.toHaveBeenCalled()
  })

  test('justifies the text at the top when overflowing, centred otherwise', () => {
    const centred = mountBand({ overflowing: false })
    expect(
      getComputedStyle(centred.find('[data-testid="reader-band__text"]').element).justifyContent
    ).toBe('center')

    const overflowing = mountBand({ overflowing: true })
    expect(
      getComputedStyle(overflowing.find('[data-testid="reader-band__text"]').element).justifyContent
    ).toBe('flex-start')
  })
})
