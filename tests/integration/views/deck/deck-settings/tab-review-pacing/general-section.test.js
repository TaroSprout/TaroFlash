import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, reactive, ref, useAttrs } from 'vue'
import { deckEditorKey } from '@/composables/deck/editor'
import GeneralSection from '@/views/deck/deck-settings/tab-review-pacing/general-section.vue'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

// mockIsCoarse is a plain container so it can be assigned inside vi.hoisted
// (where Vue's `ref` is not yet importable). Tests mutate `.ref`.
const { mockIsCoarse } = vi.hoisted(() => {
  const mockIsCoarse = { ref: null }
  return { mockIsCoarse }
})

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: vi.fn(() => mockIsCoarse.ref)
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────

const ToggleStub = defineComponent({
  name: 'UiToggle',
  props: { checked: { type: Boolean, default: false } },
  emits: ['update:checked'],
  inheritAttrs: false,
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'label',
        { 'data-testid': 'ui-kit-toggle', 'data-checked': String(!!props.checked), ...attrs },
        [
          h('span', { 'data-testid': 'ui-kit-toggle__label' }, slots.default?.()),
          h('input', {
            type: 'checkbox',
            checked: !!props.checked,
            'data-testid': 'ui-kit-toggle__input',
            onChange: (e) => emit('update:checked', e.target.checked)
          })
        ]
      )
  }
})

// Renders one button per option, tagged data-testid="option-<value>", carrying
// data-active — matches the ui-kit convention the real component exposes.
const OptionGroupStub = defineComponent({
  name: 'UiOptionGroup',
  props: { options: { type: Array, default: () => [] }, value: { type: String, default: '' } },
  emits: ['update:value'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        { ...attrs },
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

// ── Fixture ───────────────────────────────────────────────────────────────────

function makeWrapper({ config: configOverrides = {}, coarse = false } = {}) {
  mockIsCoarse.ref = ref(coarse)
  const draft = reactive({ study_config: { shuffle: false, ...configOverrides } })
  const wrapper = mount(GeneralSection, {
    global: {
      provide: { [deckEditorKey]: { draft } },
      stubs: { UiToggle: ToggleStub, UiOptionGroup: OptionGroupStub },
      mocks: { $t: (k) => k }
    }
  })
  return { wrapper, config: draft.study_config }
}

// ── shuffle toggle ────────────────────────────────────────────────────────────

describe('GeneralSection — shuffle toggle', () => {
  test('renders one behavior toggle bound to draft.study_config.shuffle', () => {
    const { wrapper } = makeWrapper({ config: { shuffle: true } })
    expect(wrapper.findComponent(ToggleStub).props('checked')).toBe(true)
  })

  test('updates draft.study_config.shuffle when the toggle changes', async () => {
    const { wrapper, config } = makeWrapper()
    wrapper.findComponent(ToggleStub).vm.$emit('update:checked', true)
    await wrapper.vm.$nextTick()
    expect(config.shuffle).toBe(true)
  })
})

// ── starting-side option group [obligation] ───────────────────────────────────

describe('GeneralSection — starting-side option group [obligation]', () => {
  test('displays "front" as active when draft.study_config.starting_side is absent [obligation]', () => {
    const { wrapper } = makeWrapper()
    const group = wrapper.find('[data-testid="tab-review-pacing__starting-side-options"]')
    expect(group.find('[data-testid="option-front"]').attributes('data-active')).toBe('true')
  })

  test('reflects an existing draft.study_config.starting_side value', () => {
    const { wrapper } = makeWrapper({ config: { starting_side: 'random' } })
    const group = wrapper.find('[data-testid="tab-review-pacing__starting-side-options"]')
    expect(group.find('[data-testid="option-random"]').attributes('data-active')).toBe('true')
  })

  test('writes "back" into draft.study_config.starting_side when the back option is picked [obligation]', async () => {
    const { wrapper, config } = makeWrapper()
    await wrapper.find('[data-testid="option-back"]').trigger('click')
    expect(config.starting_side).toBe('back')
  })

  test('writes "random" into draft.study_config.starting_side when the random option is picked [obligation]', async () => {
    const { wrapper, config } = makeWrapper()
    await wrapper.find('[data-testid="option-random"]').trigger('click')
    expect(config.starting_side).toBe('random')
  })

  test('writes "front" into draft.study_config.starting_side when the front option is picked from a "back" draft [obligation]', async () => {
    const { wrapper, config } = makeWrapper({ config: { starting_side: 'back' } })
    await wrapper.find('[data-testid="option-front"]').trigger('click')
    expect(config.starting_side).toBe('front')
  })

  test('renders the starting-side row wrapper', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__starting-side"]').exists()).toBe(true)
  })

  test('passes size="base" to the option group on a coarse pointer [obligation]', () => {
    const { wrapper } = makeWrapper({ coarse: true })
    const group = wrapper.find('[data-testid="tab-review-pacing__starting-side-options"]')
    expect(group.attributes('size')).toBe('base')
  })

  test('passes size="sm" to the option group on a fine pointer [obligation]', () => {
    const { wrapper } = makeWrapper({ coarse: false })
    const group = wrapper.find('[data-testid="tab-review-pacing__starting-side-options"]')
    expect(group.attributes('size')).toBe('sm')
  })
})
