import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import IconPicker from '@/views/deck/cover-designer/icon-picker.vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

const SUPPORTED_ICONS = ['card-deck', 'book', 'school-cap']

function makePicker(props = {}) {
  return shallowMount(IconPicker, {
    props: {
      supported_icons: SUPPORTED_ICONS,
      icon: undefined,
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

describe('IconPicker', () => {
  test('renders one option per supported icon', () => {
    const wrapper = makePicker()
    SUPPORTED_ICONS.forEach((name) => {
      expect(wrapper.find(`[data-testid="icon-picker__option-${name}"]`).exists()).toBe(true)
    })
  })

  test('marks the selected icon with data-selected', () => {
    const wrapper = makePicker({ icon: 'book' })
    expect(
      wrapper.find('[data-testid="icon-picker__option-book"]').attributes('data-selected')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="icon-picker__option-card-deck"]').attributes('data-selected')
    ).toBeUndefined()
  })

  test('clicking an unselected icon emits update:icon with that name', async () => {
    const wrapper = makePicker({ icon: 'book' })
    await wrapper.find('[data-testid="icon-picker__option-school-cap"]').trigger('click')

    expect(wrapper.emitted('update:icon')).toEqual([['school-cap']])
    expect(mockEmitSfx).toHaveBeenCalledTimes(1)
  })

  test('clicking the already-selected icon does not emit', async () => {
    const wrapper = makePicker({ icon: 'book' })
    await wrapper.find('[data-testid="icon-picker__option-book"]').trigger('click')

    expect(wrapper.emitted('update:icon')).toBeUndefined()
    // Still plays a sound (powerdown) on the no-op.
    expect(mockEmitSfx).toHaveBeenCalledTimes(1)
  })
})
