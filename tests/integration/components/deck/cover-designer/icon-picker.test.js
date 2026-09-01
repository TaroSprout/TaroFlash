import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import IconPicker from '@/views/deck/cover-designer/icon-picker.vue'
import UiIcon from '@/components/ui-kit/icon.vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

const SUPPORTED_ICONS = ['card-deck', 'book', 'school-cap']

function makePicker(props = {}) {
  return shallowMount(IconPicker, {
    props: {
      supported_icons: SUPPORTED_ICONS,
      icon: undefined,
      palette: undefined,
      ...props
    }
  })
}

function optionIcon(wrapper, name) {
  return wrapper.find(`[data-testid="icon-picker__option-${name}"]`).findComponent(UiIcon)
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

describe('IconPicker — icon palette', () => {
  // coverIconPalette() keeps the icon legible against its own card's fill —
  // sits on the ui-icon itself, never the button, so the button's own
  // --color-accent (the deck's chosen palette) still drives its own fill.

  test('sets data-palette to yellow on every option icon for a non-yellow cover palette', () => {
    const wrapper = makePicker({ palette: 'blue' })
    SUPPORTED_ICONS.forEach((name) => {
      expect(optionIcon(wrapper, name).attributes('data-palette')).toBe('yellow')
    })
  })

  test('sets data-palette to purple on every option icon when the cover palette is yellow', () => {
    const wrapper = makePicker({ palette: 'yellow' })
    SUPPORTED_ICONS.forEach((name) => {
      expect(optionIcon(wrapper, name).attributes('data-palette')).toBe('purple')
    })
  })

  test('does not put data-palette on the option button itself', () => {
    const wrapper = makePicker({ palette: 'yellow' })
    expect(
      wrapper.find('[data-testid="icon-picker__option-book"]').attributes('data-palette')
    ).toBeUndefined()
  })
})

describe('IconPicker — colours only the selected option', () => {
  // A fixed mid-review after every option was coloured, not just the picked
  // one — the selected icon alone takes the accent fill colour.

  test('colours the selected option icon with the accent colour', () => {
    const wrapper = makePicker({ icon: 'book' })
    expect(optionIcon(wrapper, 'book').classes()).toContain('text-(--color-accent)')
  })

  test('leaves unselected option icons uncoloured', () => {
    const wrapper = makePicker({ icon: 'book' })
    expect(optionIcon(wrapper, 'card-deck').classes()).not.toContain('text-(--color-accent)')
    expect(optionIcon(wrapper, 'school-cap').classes()).not.toContain('text-(--color-accent)')
  })

  test('unselected options keep the button base text-ink-muted class', () => {
    const wrapper = makePicker({ icon: 'book' })
    expect(wrapper.find('[data-testid="icon-picker__option-card-deck"]').classes()).toContain(
      'text-ink-muted'
    )
  })

  test('unselected options keep the button hover:text-(--color-accent-muted) class', () => {
    const wrapper = makePicker({ icon: 'book' })
    expect(wrapper.find('[data-testid="icon-picker__option-card-deck"]').classes()).toContain(
      'hover:text-(--color-accent-muted)'
    )
  })
})
