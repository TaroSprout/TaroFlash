import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { pacingFieldsKey } from '@/views/deck/deck-settings/tab-review-pacing/use-pacing-fields'
import { presetActionsKey } from '@/views/deck/deck-settings/tab-review-pacing/use-preset-actions'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))

import PresetChip from '@/views/deck/deck-settings/tab-review-pacing/preset-chip.vue'

// ── Stub ──────────────────────────────────────────────────────────────────────

const DropdownButtonStub = defineComponent({
  name: 'UiDropdownButton',
  inheritAttrs: false,
  props: {
    options: { type: Array, default: () => [] },
    position: String,
    fallbackPlacements: Array
  },
  emits: ['select'],
  setup(props, { emit, slots, attrs }) {
    return () =>
      h('div', { ...attrs, 'data-testid': 'preset-chip' }, [
        h('span', { 'data-testid': 'preset-chip__label' }, slots.default?.()),
        ...props.options.map((option) =>
          h(
            'button',
            {
              key: option.value,
              'data-testid': `preset-chip__option-${option.value}`,
              'data-disabled': option.disabled ?? false,
              disabled: option.disabled,
              onClick: () => emit('select', option)
            },
            option.label
          )
        )
      ])
  }
})

// ── Fixture ───────────────────────────────────────────────────────────────────

const PRESET_OPTIONS = [
  { value: '1', label: 'Default' },
  { value: '2', label: 'Aggressive' }
]

function makePacingFields({ selected = '1', override_count = 0 } = {}) {
  return {
    preset_options: ref(PRESET_OPTIONS),
    selected_preset_value: ref(selected),
    override_count: ref(override_count)
  }
}

function makePresetActions({ is_system_preset = false, has_overrides = false } = {}) {
  return {
    is_system_preset: ref(is_system_preset),
    has_overrides: ref(has_overrides),
    busy: ref(false),
    onFork: vi.fn(async () => {}),
    onPush: vi.fn(async () => {}),
    onRename: vi.fn(async () => {}),
    onDelete: vi.fn(async () => {})
  }
}

function makeWrapper({ pacing_fields, preset_actions } = {}) {
  const pacing = pacing_fields ?? makePacingFields()
  const actions = preset_actions ?? makePresetActions()
  const wrapper = mount(PresetChip, {
    global: {
      provide: { [pacingFieldsKey]: pacing, [presetActionsKey]: actions },
      stubs: { UiDropdownButton: DropdownButtonStub }
    }
  })
  return { wrapper, pacing, actions }
}

// ── rendering ─────────────────────────────────────────────────────────────────

describe('PresetChip — rendering', () => {
  test('displays the label of the currently selected preset', () => {
    const { wrapper } = makeWrapper({ pacing_fields: makePacingFields({ selected: '2' }) })
    expect(wrapper.find('[data-testid="preset-chip__label"]').text()).toBe('Aggressive')
  })

  test('updates the displayed label when selected_preset_value changes', async () => {
    const pacing_fields = makePacingFields({ selected: '1' })
    const { wrapper } = makeWrapper({ pacing_fields })
    expect(wrapper.find('[data-testid="preset-chip__label"]').text()).toBe('Default')

    pacing_fields.selected_preset_value.value = '2'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="preset-chip__label"]').text()).toBe('Aggressive')
  })
})

// ── action rows — system vs member preset [obligation] ────────────────────────

describe('PresetChip — action rows [obligation]', () => {
  test('system preset shows ONLY the fork action row [obligation]', () => {
    const { wrapper } = makeWrapper({
      preset_actions: makePresetActions({ is_system_preset: true })
    })
    const options = wrapper.findComponent(DropdownButtonStub).props('options')
    const action_values = options.filter((o) =>
      ['fork', 'push', 'rename', 'delete'].includes(o.value)
    )

    expect(action_values.map((o) => o.value)).toEqual(['fork'])
  })

  test('a member preset shows fork + push + rename + delete [obligation]', () => {
    const { wrapper } = makeWrapper({
      preset_actions: makePresetActions({ is_system_preset: false })
    })
    const options = wrapper.findComponent(DropdownButtonStub).props('options')
    const action_values = options.filter((o) =>
      ['fork', 'push', 'rename', 'delete'].includes(o.value)
    )

    expect(action_values.map((o) => o.value)).toEqual(['fork', 'push', 'rename', 'delete'])
  })

  test('the push row is disabled when there are no overrides [obligation]', () => {
    const { wrapper } = makeWrapper({
      preset_actions: makePresetActions({ is_system_preset: false, has_overrides: false })
    })
    const options = wrapper.findComponent(DropdownButtonStub).props('options')
    const push = options.find((o) => o.value === 'push')

    expect(push.disabled).toBe(true)
  })

  test('the push row is enabled when overrides are pinned [obligation]', () => {
    const { wrapper } = makeWrapper({
      preset_actions: makePresetActions({ is_system_preset: false, has_overrides: true })
    })
    const options = wrapper.findComponent(DropdownButtonStub).props('options')
    const push = options.find((o) => o.value === 'push')

    expect(push.disabled).toBe(false)
  })
})

// ── popover placement [obligation] ─────────────────────────────────────────────

describe('PresetChip — popover placement [obligation]', () => {
  test('passes position="bottom-end" to the dropdown button [obligation]', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.findComponent(DropdownButtonStub).props('position')).toBe('bottom-end')
  })

  test('passes end-only fallback placements to the dropdown button [obligation]', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.findComponent(DropdownButtonStub).props('fallbackPlacements')).toEqual([
      'bottom-end',
      'top-end'
    ])
  })
})

// ── select sfx [obligation] ─────────────────────────────────────────────────────

describe('PresetChip — select sfx [obligation]', () => {
  test('emits the select sfx when picking a preset row [obligation]', async () => {
    const { wrapper } = makeWrapper()
    mockEmitSfx.mockClear()
    await wrapper.find('[data-testid="preset-chip__option-2"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('select')
  })

  test('emits the select sfx when picking a CRUD action row [obligation]', async () => {
    const { wrapper } = makeWrapper()
    mockEmitSfx.mockClear()
    await wrapper.find('[data-testid="preset-chip__option-fork"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('select')
  })
})

// ── selection vs action dispatch [obligation] ──────────────────────────────────

describe('PresetChip — selecting an option [obligation]', () => {
  test('selecting a preset row writes selected_preset_value and does NOT invoke a handler [obligation]', async () => {
    const pacing_fields = makePacingFields({ selected: '1' })
    const preset_actions = makePresetActions()
    const { wrapper } = makeWrapper({ pacing_fields, preset_actions })

    await wrapper.find('[data-testid="preset-chip__option-2"]').trigger('click')

    expect(pacing_fields.selected_preset_value.value).toBe('2')
    expect(preset_actions.onFork).not.toHaveBeenCalled()
    expect(preset_actions.onPush).not.toHaveBeenCalled()
    expect(preset_actions.onRename).not.toHaveBeenCalled()
    expect(preset_actions.onDelete).not.toHaveBeenCalled()
  })

  test('selecting an action row invokes its handler and does NOT write selected_preset_value [obligation]', async () => {
    const pacing_fields = makePacingFields({ selected: '1' })
    const preset_actions = makePresetActions()
    const { wrapper } = makeWrapper({ pacing_fields, preset_actions })

    await wrapper.find('[data-testid="preset-chip__option-fork"]').trigger('click')

    expect(preset_actions.onFork).toHaveBeenCalledTimes(1)
    expect(pacing_fields.selected_preset_value.value).toBe('1')
  })

  test('selecting the rename action invokes onRename', async () => {
    const preset_actions = makePresetActions()
    const { wrapper } = makeWrapper({ preset_actions })

    await wrapper.find('[data-testid="preset-chip__option-rename"]').trigger('click')

    expect(preset_actions.onRename).toHaveBeenCalledTimes(1)
  })

  test('selecting the delete action invokes onDelete', async () => {
    const preset_actions = makePresetActions()
    const { wrapper } = makeWrapper({ preset_actions })

    await wrapper.find('[data-testid="preset-chip__option-delete"]').trigger('click')

    expect(preset_actions.onDelete).toHaveBeenCalledTimes(1)
  })

  test('selecting the push action invokes onPush', async () => {
    const preset_actions = makePresetActions({ has_overrides: true })
    const { wrapper } = makeWrapper({ preset_actions })

    await wrapper.find('[data-testid="preset-chip__option-push"]').trigger('click')

    expect(preset_actions.onPush).toHaveBeenCalledTimes(1)
  })
})
