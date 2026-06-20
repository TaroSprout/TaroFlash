import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import AlignPicker from '@/components/modals/deck-settings/tab-design/card-designer/align-picker.vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

function makePicker(props = {}) {
  let h_model = props.horizontal
  let v_model = props.vertical
  const wrapper = mount(AlignPicker, {
    props: {
      ...props,
      'onUpdate:horizontal': (v) => {
        h_model = v
        wrapper.setProps({ horizontal: v })
      },
      'onUpdate:vertical': (v) => {
        v_model = v
        wrapper.setProps({ vertical: v })
      }
    }
  })
  return {
    wrapper,
    getHorizontal: () => h_model,
    getVertical: () => v_model
  }
}

describe('AlignPicker', () => {
  beforeEach(() => mockEmitSfx.mockClear())

  test('renders 9 cells (3x3 grid)', () => {
    const { wrapper } = makePicker()
    expect(wrapper.findAll('[data-testid^="align-picker__cell-"]')).toHaveLength(9)
  })

  test('defaults active cell to center-center when both models unset', () => {
    const { wrapper } = makePicker()
    expect(
      wrapper.find('[data-testid="align-picker__cell-center-center"]').attributes('data-active')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="align-picker__cell-left-top"]').attributes('data-active')
    ).toBe('false')
  })

  test('marks active cell from horizontal + vertical models', () => {
    const { wrapper } = makePicker({ horizontal: 'right', vertical: 'bottom' })
    expect(
      wrapper.find('[data-testid="align-picker__cell-right-bottom"]').attributes('data-active')
    ).toBe('true')
    expect(
      wrapper.find('[data-testid="align-picker__cell-center-center"]').attributes('data-active')
    ).toBe('false')
  })

  test('clicking a cell updates both horizontal and vertical', async () => {
    const { wrapper, getHorizontal, getVertical } = makePicker()
    await wrapper.find('[data-testid="align-picker__cell-left-top"]').trigger('click')
    expect(getHorizontal()).toBe('left')
    expect(getVertical()).toBe('top')
  })

  test('clicking the active cell does not change models', async () => {
    const { wrapper, getHorizontal, getVertical } = makePicker({
      horizontal: 'left',
      vertical: 'top'
    })
    await wrapper.find('[data-testid="align-picker__cell-left-top"]').trigger('click')
    expect(getHorizontal()).toBe('left')
    expect(getVertical()).toBe('top')
  })

  test('plays select sfx when changing to a new cell', async () => {
    const { wrapper } = makePicker({ horizontal: 'left', vertical: 'top' })
    await wrapper.find('[data-testid="align-picker__cell-right-bottom"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('etc_camera_shutter')
  })

  test('plays reselect sfx when clicking the active cell', async () => {
    const { wrapper } = makePicker({ horizontal: 'left', vertical: 'top' })
    await wrapper.find('[data-testid="align-picker__cell-left-top"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('digi_powerdown')
  })

  test('selecting center/center from a non-default state writes undefined to both models [obligation]', async () => {
    const { wrapper, getHorizontal, getVertical } = makePicker({
      horizontal: 'left',
      vertical: 'top'
    })
    await wrapper.find('[data-testid="align-picker__cell-center-center"]').trigger('click')
    expect(getHorizontal()).toBeUndefined()
    expect(getVertical()).toBeUndefined()
  })

  test('center/center cell becomes active when models are set to undefined [obligation]', async () => {
    const { wrapper } = makePicker({ horizontal: 'left', vertical: 'top' })
    await wrapper.find('[data-testid="align-picker__cell-center-center"]').trigger('click')
    expect(
      wrapper.find('[data-testid="align-picker__cell-center-center"]').attributes('data-active')
    ).toBe('true')
  })
})
