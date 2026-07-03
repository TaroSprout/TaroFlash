import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

const { mockUseMatchMedia } = vi.hoisted(() => ({
  mockUseMatchMedia: vi.fn()
}))

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: mockUseMatchMedia
}))

// UiButton emits 'press' on click so parent @press handlers fire.
const UiButtonStub = defineComponent({
  name: 'UiButton',
  inheritAttrs: false,
  emits: ['press'],
  setup(_p, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        {
          ...attrs,
          onClick: () => emit('press')
        },
        slots.default?.()
      )
  }
})

// UiOptionGroup stub — renders one button per option, emits update:value on click.
const UiOptionGroupStub = defineComponent({
  name: 'UiOptionGroup',
  inheritAttrs: false,
  props: { options: { type: Array, default: () => [] }, value: { type: String, default: '' } },
  emits: ['update:value'],
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        {
          'data-testid': attrs['data-testid'] ?? 'ui-option-group-stub',
          'data-value': props.value
        },
        props.options.map((option) =>
          h(
            'button',
            {
              key: option.value,
              'data-testid': `option-${option.value}`,
              'data-active': String(option.value === props.value),
              onClick: () => emit('update:value', option.value)
            },
            option.label
          )
        )
      )
  }
})

const UiSelectMenuStub = defineComponent({
  name: 'UiSelectMenu',
  inheritAttrs: false,
  props: { modelValue: { type: String, default: '' }, options: { type: Array, default: () => [] } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        {
          'data-testid': attrs['data-testid'] ?? 'ui-select-menu-stub',
          'data-value': props.modelValue
        },
        [
          h('button', {
            'data-testid': 'ui-select-menu-stub__select-difficulty',
            onClick: () => emit('update:modelValue', 'difficulty')
          })
        ]
      )
  }
})

import PageSettingsPanel from '@/views/deck/mode-toolbar/page-settings-panel.vue'
import { deckViewShellKey } from '@/views/deck/composables/view-shell'

function makeShell({
  grid_size_val = 'md',
  grid_face_val = 'front',
  sort_by_val = 'default'
} = {}) {
  const grid_size = ref(grid_size_val)
  const grid_face = ref(grid_face_val)
  const sort_by = ref(sort_by_val)
  return {
    grid_size,
    setGridSize: vi.fn((size) => (grid_size.value = size)),
    grid_face,
    setGridFace: vi.fn((face) => (grid_face.value = face)),
    sort_by,
    setSortBy: vi.fn((key) => (sort_by.value = key)),
    closePageSettings: vi.fn()
  }
}

function mountPanel(shell = makeShell(), { is_mobile = false } = {}) {
  mockUseMatchMedia.mockReturnValue(ref(is_mobile))
  return {
    wrapper: shallowMount(PageSettingsPanel, {
      global: {
        provide: { [deckViewShellKey]: shell },
        stubs: {
          UiButton: UiButtonStub,
          UiOptionGroup: UiOptionGroupStub,
          UiSelectMenu: UiSelectMenuStub
        }
      }
    }),
    shell
  }
}

describe('PageSettingsPanel', () => {
  beforeEach(() => {
    mockUseMatchMedia.mockReset()
  })

  // ── Close button ────────────────────────────────────────────────────────

  test('close button calls closePageSettings', async () => {
    const { wrapper, shell } = mountPanel()
    await wrapper.find('[data-testid="page-settings-panel__close"]').trigger('click')
    expect(shell.closePageSettings).toHaveBeenCalledOnce()
  })

  // ── Card face options ──────────────────────────────────────────────────────

  test('renders the front/back face option group with the current grid_face', () => {
    const { wrapper } = mountPanel(makeShell({ grid_face_val: 'back' }))
    const group = wrapper.find('[data-testid="page-settings-panel__face"]')
    expect(group.find('[data-testid="option-back"]').attributes('data-active')).toBe('true')
    expect(group.find('[data-testid="option-front"]').attributes('data-active')).toBe('false')
  })

  test('selecting a face option calls setGridFace with that value [obligation]', async () => {
    const { wrapper, shell } = mountPanel(makeShell({ grid_face_val: 'front' }))
    await wrapper.find('[data-testid="option-back"]').trigger('click')
    expect(shell.setGridFace).toHaveBeenCalledWith('back')
  })

  // ── Card size options ──────────────────────────────────────────────────────

  test('renders the card size option group with the current grid_size', () => {
    const { wrapper } = mountPanel(makeShell({ grid_size_val: 'xl' }))
    const group = wrapper.find('[data-testid="page-settings-panel__card-size"]')
    expect(group.find('[data-testid="option-xl"]').attributes('data-active')).toBe('true')
  })

  test('selecting a card size option calls setGridSize with that value', async () => {
    const { wrapper, shell } = mountPanel(makeShell({ grid_size_val: 'md' }))
    await wrapper.find('[data-testid="option-base"]').trigger('click')
    expect(shell.setGridSize).toHaveBeenCalledWith('base')
  })

  // ── Sort select field ──────────────────────────────────────────────────────

  test('renders the sort select field with current sort_by value', () => {
    const { wrapper } = mountPanel(makeShell({ sort_by_val: 'default' }))
    expect(wrapper.find('[data-testid="ui-select-menu-stub"]').attributes('data-value')).toBe(
      'default'
    )
  })

  test('selecting a sort option calls setSortBy with the new key', async () => {
    const { wrapper, shell } = mountPanel()
    await wrapper.find('[data-testid="ui-select-menu-stub__select-difficulty"]').trigger('click')
    expect(shell.setSortBy).toHaveBeenCalledWith('difficulty')
  })

  // ── Face and size are independent controls [obligation] ───────────────────

  test('changing card face does not affect card size selection [obligation]', async () => {
    const { wrapper, shell } = mountPanel(
      makeShell({ grid_face_val: 'front', grid_size_val: 'md' })
    )
    await wrapper.find('[data-testid="option-back"]').trigger('click')
    expect(shell.setGridFace).toHaveBeenCalledWith('back')
    expect(shell.setGridSize).not.toHaveBeenCalled()
  })
})
