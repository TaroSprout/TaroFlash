import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import PaintTarget from '@/views/admin/color-page/paint-target.vue'
import { makeTuner } from './fixtures'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }))

const tuner = makeTuner()

vi.mock('@/views/admin/color-page/use-color-tuner', () => ({
  injectColorTuner: () => tuner
}))

beforeEach(() => {
  tuner.setElementBg.mockClear()
  tuner.setElementText.mockClear()
  tuner.isElementChanged.mockReturnValue(false)
  tuner.elementBinding.mockReturnValue({ bg: 'surface', text: 'ink' })
})

function mountTarget(props = {}) {
  return mount(PaintTarget, {
    props: { element_id: 'canvas', mode: 'light', station: 'page', ...props }
  })
}

describe('PaintTarget — rendering', () => {
  test('renders as the given tag', () => {
    const wrapper = mountTarget({ tag: 'article' })
    expect(wrapper.element.tagName).toBe('ARTICLE')
  })

  test('marks data-changed from isElementChanged', () => {
    tuner.isElementChanged.mockReturnValue(true)
    const wrapper = mountTarget()
    expect(wrapper.attributes('data-changed')).toBe('true')
  })
})

describe('PaintTarget — badge editor', () => {
  test('clicking the badge opens the editor', async () => {
    const wrapper = mountTarget()
    expect(wrapper.find('[data-testid="paint-target__editor"]').exists()).toBe(false)

    await wrapper.find('[data-testid="paint-target__badge"]').trigger('click')

    expect(wrapper.find('[data-testid="paint-target__editor"]').exists()).toBe(true)
  })

  test('clicking the badge again closes the editor', async () => {
    const wrapper = mountTarget()
    await wrapper.find('[data-testid="paint-target__badge"]').trigger('click')
    await wrapper.find('[data-testid="paint-target__badge"]').trigger('click')

    expect(wrapper.find('[data-testid="paint-target__editor"]').exists()).toBe(false)
  })

  test('changing the fill select calls setElementBg with the picked role', async () => {
    const wrapper = mountTarget()
    await wrapper.find('[data-testid="paint-target__badge"]').trigger('click')

    const [fill_select] = wrapper.findAll('select')
    await fill_select.setValue('raised')

    expect(tuner.setElementBg).toHaveBeenCalledWith('canvas', 'raised')
  })

  test('picking the blank fill option calls setElementBg with null', async () => {
    const wrapper = mountTarget()
    await wrapper.find('[data-testid="paint-target__badge"]').trigger('click')

    const [fill_select] = wrapper.findAll('select')
    await fill_select.setValue('')

    expect(tuner.setElementBg).toHaveBeenCalledWith('canvas', null)
  })

  test('changing the text select calls setElementText with the picked role', async () => {
    const wrapper = mountTarget()
    await wrapper.find('[data-testid="paint-target__badge"]').trigger('click')

    const [, text_select] = wrapper.findAll('select')
    await text_select.setValue('ink-muted')

    expect(tuner.setElementText).toHaveBeenCalledWith('canvas', 'ink-muted')
  })

  test('no text select renders when the element has no text binding', async () => {
    tuner.elementBinding.mockReturnValue({ bg: 'surface', text: null })
    const wrapper = mountTarget()
    await wrapper.find('[data-testid="paint-target__badge"]').trigger('click')

    expect(wrapper.findAll('select')).toHaveLength(1)
  })
})
