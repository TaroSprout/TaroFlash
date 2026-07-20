import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import UiThemePicker from '@/components/ui-kit/theme-picker.vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

const DEFAULT_PALETTES = ['blue', 'green', 'pink', 'red']

function makePicker(props = {}) {
  return shallowMount(UiThemePicker, {
    props: {
      label: 'Theme',
      supported_palettes: DEFAULT_PALETTES,
      palette: undefined,

      ...props
    },
    global: {
      directives: { sfx: {} }
    }
  })
}

beforeEach(() => {
  mockEmitSfx.mockClear()
})

describe('UiThemePicker', () => {
  test('renders the provided label', () => {
    const wrapper = makePicker({ label: 'Card theme' })
    expect(wrapper.find('[data-testid="theme-picker__label"]').text()).toBe('Card theme')
  })

  test('renders one button per supported palette option', () => {
    const wrapper = makePicker()
    DEFAULT_PALETTES.forEach((option) => {
      const btn = wrapper.find(`[data-testid="theme-picker__option-${option}"]`)
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('data-palette')).toBe(option)
    })
  })

  test('clicking an unselected option emits update:palette with the option value', async () => {
    const wrapper = makePicker({ palette: 'blue' })
    await wrapper.find('[data-testid="theme-picker__option-green"]').trigger('click')

    expect(wrapper.emitted('update:palette')).toEqual([['green']])
    expect(mockEmitSfx).toHaveBeenCalledTimes(1)
  })

  test('clicking the already-selected option does not emit update:palette', async () => {
    const wrapper = makePicker({ palette: 'blue' })
    await wrapper.find('[data-testid="theme-picker__option-blue"]').trigger('click')

    expect(wrapper.emitted('update:palette')).toBeUndefined()
    expect(mockEmitSfx).toHaveBeenCalledTimes(1)
  })
})
