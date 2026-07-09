import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import ImageLayoutPicker from '@/views/deck/deck-settings/tab-design/card-designer/image-layout-picker.vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

function makePicker(props = {}) {
  let layout = props.layout
  const wrapper = mount(ImageLayoutPicker, {
    props: {
      ...props,
      'onUpdate:layout': (v) => {
        layout = v
        wrapper.setProps({ layout: v })
      }
    }
  })
  return { wrapper, getLayout: () => layout }
}

const optionTestId = (layout) => `[data-testid="image-layout-picker__option-${layout}"]`

describe('ImageLayoutPicker', () => {
  beforeEach(() => mockEmitSfx.mockClear())

  test('renders one option per layout', () => {
    const { wrapper } = makePicker()
    expect(wrapper.findAll('[data-testid^="image-layout-picker__option-"]')).toHaveLength(3)
  })

  test('renders a skeleton preview for each layout', () => {
    const { wrapper } = makePicker()
    const layouts = wrapper
      .findAll('[data-testid="layout-skeleton"]')
      .map((el) => el.attributes('data-layout'))
    expect(layouts).toEqual(['above', 'below', 'behind'])
  })

  test('defaults the active option to "above" when layout is unset', () => {
    const { wrapper } = makePicker()
    expect(wrapper.find(optionTestId('above')).attributes('data-active')).toBe('true')
    expect(wrapper.find(optionTestId('below')).attributes('data-active')).toBe('false')
  })

  test('marks the active option from the layout model', () => {
    const { wrapper } = makePicker({ layout: 'behind' })
    expect(wrapper.find(optionTestId('behind')).attributes('data-active')).toBe('true')
    expect(wrapper.find(optionTestId('above')).attributes('data-active')).toBe('false')
  })

  test('clicking an option updates the layout model', async () => {
    const { wrapper, getLayout } = makePicker()
    await wrapper.find(optionTestId('behind')).trigger('click')
    expect(getLayout()).toBe('behind')
  })

  test('clicking the active option does not change the model', async () => {
    const { wrapper, getLayout } = makePicker({ layout: 'below' })
    await wrapper.find(optionTestId('below')).trigger('click')
    expect(getLayout()).toBe('below')
  })

  test('plays select sfx when changing to a new option', async () => {
    const { wrapper } = makePicker({ layout: 'above' })
    await wrapper.find(optionTestId('below')).trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('select')
  })

  test('plays reselect sfx when clicking the active option', async () => {
    const { wrapper } = makePicker({ layout: 'above' })
    await wrapper.find(optionTestId('above')).trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
  })
})
