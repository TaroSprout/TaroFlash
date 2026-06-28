import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))

vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx, emitHoverSfx: vi.fn() }))

// ── Stubs ──────────────────────────────────────────────────────────────────────

// UiPopover stub that renders both trigger and default slots so we can interact
// with the trigger button and the option list. Exposes data-open so tests can
// assert menu visibility. Emits close so the component's @close handler fires.
const UiPopoverStub = defineComponent({
  name: 'UiPopover',
  inheritAttrs: false,
  props: ['open'],
  emits: ['close'],
  setup(props, { slots }) {
    return () =>
      h('div', { 'data-open': String(props.open) }, [
        h('div', { 'data-testid': 'popover-trigger' }, slots.trigger?.()),
        h('div', { 'data-testid': 'popover-menu' }, slots.default?.())
      ])
  }
})

const UiIconStub = defineComponent({
  name: 'UiIcon',
  setup() {
    return () => h('span', { 'data-testid': 'ui-icon-stub' })
  }
})

// ── Import ─────────────────────────────────────────────────────────────────────

import UiSelectField from '@/components/ui-kit/select-field.vue'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_OPTIONS = [
  { value: 'default', label: 'Default order' },
  { value: 'difficulty', label: 'By difficulty' }
]

function mountSelectField({ modelValue = 'default', options = DEFAULT_OPTIONS } = {}) {
  const modelRef = ref(modelValue)
  const wrapper = shallowMount(UiSelectField, {
    props: {
      options,
      modelValue: modelRef.value,
      'onUpdate:modelValue': (v) => {
        modelRef.value = v
        wrapper.setProps({ modelValue: v })
      }
    },
    global: {
      stubs: { UiPopover: UiPopoverStub, UiIcon: UiIconStub }
    }
  })
  return { wrapper, modelRef }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UiSelectField', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
  })

  // ── Rendering ─────────────────────────────────────────────────────────────

  test('renders the root with data-testid="ui-select-field"', () => {
    const { wrapper } = mountSelectField()
    expect(wrapper.find('[data-testid="ui-select-field"]').exists()).toBe(true)
  })

  test('trigger button shows the label of the current modelValue', () => {
    const { wrapper } = mountSelectField({ modelValue: 'default' })
    const trigger = wrapper.find('[data-testid="ui-select-field__trigger"]')
    expect(trigger.text()).toContain('Default order')
  })

  test('trigger label updates when modelValue prop changes', async () => {
    const { wrapper } = mountSelectField({ modelValue: 'default' })
    await wrapper.setProps({ modelValue: 'difficulty' })
    expect(wrapper.find('[data-testid="ui-select-field__trigger"]').text()).toContain(
      'By difficulty'
    )
  })

  // ── Open / close via trigger ───────────────────────────────────────────────

  test('popover starts closed (data-open="false")', () => {
    const { wrapper } = mountSelectField()
    expect(wrapper.find('[data-open]').attributes('data-open')).toBe('false')
  })

  test('clicking the trigger opens the menu', async () => {
    const { wrapper } = mountSelectField()
    await wrapper.find('[data-testid="ui-select-field__trigger"]').trigger('click')
    expect(wrapper.find('[data-open]').attributes('data-open')).toBe('true')
  })

  test('clicking the trigger again closes the menu', async () => {
    const { wrapper } = mountSelectField()
    await wrapper.find('[data-testid="ui-select-field__trigger"]').trigger('click')
    await wrapper.find('[data-testid="ui-select-field__trigger"]').trigger('click')
    expect(wrapper.find('[data-open]').attributes('data-open')).toBe('false')
  })

  test('clicking trigger emits snappy_button_5 sfx', async () => {
    const { wrapper } = mountSelectField()
    await wrapper.find('[data-testid="ui-select-field__trigger"]').trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })

  test('popover @close event sets open to false', async () => {
    const { wrapper } = mountSelectField()
    await wrapper.find('[data-testid="ui-select-field__trigger"]').trigger('click')
    expect(wrapper.find('[data-open]').attributes('data-open')).toBe('true')
    await wrapper.findComponent({ name: 'UiPopover' }).vm.$emit('close')
    expect(wrapper.find('[data-open]').attributes('data-open')).toBe('false')
  })

  // ── Options ───────────────────────────────────────────────────────────────

  test('renders one option button per entry in options prop', () => {
    const { wrapper } = mountSelectField()
    expect(wrapper.findAll('[data-testid="ui-select-field__option"]')).toHaveLength(2)
  })

  test('option matching modelValue has data-active="true"', () => {
    const { wrapper } = mountSelectField({ modelValue: 'difficulty' })
    const opts = wrapper.findAll('[data-testid="ui-select-field__option"]')
    // 'default' option should NOT be active
    expect(opts[0].attributes('data-active')).toBe('false')
    // 'difficulty' option should be active
    expect(opts[1].attributes('data-active')).toBe('true')
  })

  test('active option tracks modelValue prop reactively', async () => {
    const { wrapper } = mountSelectField({ modelValue: 'default' })
    const opts = () => wrapper.findAll('[data-testid="ui-select-field__option"]')
    expect(opts()[0].attributes('data-active')).toBe('true')

    await wrapper.setProps({ modelValue: 'difficulty' })
    expect(opts()[0].attributes('data-active')).toBe('false')
    expect(opts()[1].attributes('data-active')).toBe('true')
  })

  // ── Selection ─────────────────────────────────────────────────────────────

  test('clicking an option emits update:modelValue with the option value', async () => {
    const { wrapper } = mountSelectField({ modelValue: 'default' })
    await wrapper.findAll('[data-testid="ui-select-field__option"]')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['difficulty'])
  })

  test('clicking an option closes the menu', async () => {
    const { wrapper } = mountSelectField()
    await wrapper.find('[data-testid="ui-select-field__trigger"]').trigger('click')
    expect(wrapper.find('[data-open]').attributes('data-open')).toBe('true')
    await wrapper.findAll('[data-testid="ui-select-field__option"]')[0].trigger('click')
    expect(wrapper.find('[data-open]').attributes('data-open')).toBe('false')
  })

  test('clicking an option emits generic_button_15 sfx', async () => {
    const { wrapper } = mountSelectField()
    await wrapper.findAll('[data-testid="ui-select-field__option"]')[0].trigger('click')
    expect(mockEmitSfx).toHaveBeenCalledWith('generic_button_15')
  })

  // ── current_label fallback ────────────────────────────────────────────────

  test('trigger shows empty string when modelValue has no matching option (fallback branch)', () => {
    // Covers the `?? ''` branch in current_label computed
    const { wrapper } = mountSelectField({ modelValue: 'nonexistent' })
    const trigger = wrapper.find('[data-testid="ui-select-field__trigger"]')
    expect(trigger.text()).toBe('')
  })

  // ── Attrs forwarding ──────────────────────────────────────────────────────

  test('extra attrs (data-theme, data-testid) land on the root wrapper div via v-bind="$attrs"', () => {
    const wrapper = shallowMount(UiSelectField, {
      props: { options: DEFAULT_OPTIONS, modelValue: 'default' },
      attrs: { 'data-theme': 'brown-200', 'data-testid': 'my-select' },
      global: { stubs: { UiPopover: UiPopoverStub, UiIcon: UiIconStub } }
    })
    const root = wrapper.find('[data-testid="my-select"]')
    expect(root.exists()).toBe(true)
    expect(root.attributes('data-theme')).toBe('brown-200')
  })
})
