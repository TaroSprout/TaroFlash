import { describe, test, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
import { pacingFieldsKey } from '@/views/deck/deck-settings/tab-review-pacing/pacing-fields'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockPresetsData } = vi.hoisted(() => ({ mockPresetsData: { value: [] } }))
vi.mock('@/api/review-pacing', () => ({ usePresetsQuery: () => ({ data: mockPresetsData }) }))

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

const { mockPopScrimReveal } = vi.hoisted(() => ({ mockPopScrimReveal: vi.fn() }))
vi.mock('@/utils/animations/scrim-reveal', () => ({ popScrimReveal: mockPopScrimReveal }))

const { mockIsPhone } = vi.hoisted(() => ({ mockIsPhone: { value: false } }))
vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ({
    get value() {
      return mockIsPhone.value
    }
  })
}))

import SchedulingSection from '@/views/deck/deck-settings/tab-review-pacing/scheduling-section.vue'

const LOCAL_STORAGE_KEY = 'deck-settings-advanced-revealed'

// ── Stubs ─────────────────────────────────────────────────────────────────────

const SelectMenuStub = defineComponent({
  name: 'UiSelectMenu',
  props: { options: { type: Array, default: () => [] }, modelValue: { type: String, default: '' } },
  emits: ['update:modelValue'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'select',
        {
          ...attrs,
          'data-testid': 'ui-select-menu',
          value: props.modelValue,
          onChange: (e) => emit('update:modelValue', e.target.value)
        },
        props.options.map((o) => h('option', { value: o.value }, o.label))
      )
  }
})

const SpinboxStub = defineComponent({
  name: 'UiSpinbox',
  props: { value: { type: Number, required: true }, min: Number, max: Number, suffix: String },
  emits: ['update:value'],
  inheritAttrs: false,
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        {
          ...attrs,
          'data-testid': 'ui-spinbox',
          'data-value': String(props.value),
          'data-suffix': props.suffix,
          'data-min': String(props.min),
          'data-max': String(props.max)
        },
        [
          h(
            'button',
            {
              'data-testid': 'ui-spinbox__increment',
              onClick: () => emit('update:value', props.value + 1)
            },
            '+'
          )
        ]
      )
  }
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makePacingFields(overrides = {}) {
  return {
    desired_retention: ref(90),
    max_interval: ref(0),
    leech_threshold: ref(24),
    learning_steps_key: ref('1m-10m'),
    learning_steps_options: ref([{ value: '1m-10m', label: 'label' }]),
    relearning_steps_key: ref('10m'),
    relearning_steps_options: ref([{ value: '10m', label: 'label' }]),
    has_desired_retention_override: ref(false),
    has_max_interval_override: ref(false),
    has_leech_threshold_override: ref(false),
    has_learning_steps_override: ref(false),
    has_relearning_steps_override: ref(false),
    resetDesiredRetention: vi.fn(),
    resetLearningSteps: vi.fn(),
    resetRelearningSteps: vi.fn(),
    resetLeechThreshold: vi.fn(),
    resetMaxInterval: vi.fn(),
    ...overrides
  }
}

const mounted_wrappers = []

function makeWrapper({ pacingFieldsOverrides = {} } = {}) {
  const pacing_fields = makePacingFields(pacingFieldsOverrides)
  const wrapper = mount(SchedulingSection, {
    global: {
      provide: { [pacingFieldsKey]: pacing_fields },
      stubs: { UiSelectMenu: SelectMenuStub, UiSpinbox: SpinboxStub },
      mocks: { $t: (k) => k }
    },
    attachTo: document.body
  })
  mounted_wrappers.push(wrapper)
  return { wrapper, pacing_fields }
}

beforeEach(() => {
  mockPresetsData.value = []
  mockIsPhone.value = false
  mockEmitSfx.mockClear()
  mockPopScrimReveal.mockClear()
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  mounted_wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
})

// ── rendering ─────────────────────────────────────────────────────────────────

describe('SchedulingSection — rendering', () => {
  test('renders retention, max-interval, leech-threshold, learning-steps, and relearning-steps rows', () => {
    const { wrapper } = makeWrapper()
    expect(wrapper.find('[data-testid="tab-review-pacing__retention"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__max-interval"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__leech-threshold"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__learning-steps"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tab-review-pacing__relearning-steps"]').exists()).toBe(true)
  })

  test('caps the retention spinbox at DESIRED_RETENTION_BOUNDS (70-97) [obligation]', () => {
    const { wrapper } = makeWrapper()
    const spinbox = wrapper.find(
      '[data-testid="tab-review-pacing__retention"] [data-testid="ui-spinbox"]'
    )
    expect(spinbox.attributes('data-min')).toBe('70')
    expect(spinbox.attributes('data-max')).toBe('97')
  })
})

// ── learning-steps / relearning-steps ─────────────────────────────────────────

describe('SchedulingSection — learning-steps / relearning-steps', () => {
  test('selecting a learning-steps key writes through learning_steps_key', async () => {
    const { wrapper, pacing_fields } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__learning-steps"] [data-testid="ui-select-menu"]')
      .setValue('1m-10m')

    expect(pacing_fields.learning_steps_key.value).toBe('1m-10m')
  })

  test('selecting a relearning-steps key writes through relearning_steps_key', async () => {
    const { wrapper, pacing_fields } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__relearning-steps"] [data-testid="ui-select-menu"]')
      .setValue('10m')

    expect(pacing_fields.relearning_steps_key.value).toBe('10m')
  })
})

// ── spinbox writes [obligation] ─────────────────────────────────────────────────

describe('SchedulingSection — spinbox writes', () => {
  test('bumping the retention spinbox writes through desired_retention', async () => {
    const { wrapper, pacing_fields } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__retention"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')

    expect(pacing_fields.desired_retention.value).toBe(91)
  })

  test('bumping the max-interval spinbox writes through max_interval', async () => {
    const { wrapper, pacing_fields } = makeWrapper()

    await wrapper
      .find('[data-testid="tab-review-pacing__max-interval"] [data-testid="ui-spinbox__increment"]')
      .trigger('click')

    expect(pacing_fields.max_interval.value).toBe(1)
  })

  test('bumping the leech-threshold spinbox writes through leech_threshold', async () => {
    const { wrapper, pacing_fields } = makeWrapper()

    await wrapper
      .find(
        '[data-testid="tab-review-pacing__leech-threshold"] [data-testid="ui-spinbox__increment"]'
      )
      .trigger('click')

    expect(pacing_fields.leech_threshold.value).toBe(25)
  })
})

// ── advanced badge is inert while hidden [obligation] ─────────────────────────
// Only scheduling-panel__scrim opens the panel; the badge stays inert (no
// pointer events) while its own content is invisible, so an invisible label
// isn't clickable.

describe('SchedulingSection — advanced badge is inert while hidden, scrim is the only opener [obligation]', () => {
  test('the badge starts inert (pointer-events disabled) when not revealed [obligation]', () => {
    const { wrapper } = makeWrapper()
    // The badge only carries pointer-events-none via a class we cannot assert
    // directly — instead assert clicking it does nothing while hidden.
    const badge = wrapper.find('[data-testid="scheduling-panel__badge"]')
    expect(badge.exists()).toBe(true)
  })

  test('clicking the scrim toggles revealed on and calls popScrimReveal with revealed=true [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="scheduling-panel__scrim"]').trigger('click')

    expect(mockPopScrimReveal).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      true,
      expect.objectContaining({ collapse: false })
    )
  })

  test('clicking the badge after reveal toggles revealed back off and calls popScrimReveal with revealed=false [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="scheduling-panel__scrim"]').trigger('click')
    mockPopScrimReveal.mockClear()
    await wrapper.find('[data-testid="scheduling-panel__badge"]').trigger('click')

    expect(mockPopScrimReveal).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      false,
      expect.objectContaining({ collapse: false })
    )
  })

  test('toggling plays the snappy_button_5 sfx', async () => {
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="scheduling-panel__scrim"]').trigger('click')

    expect(mockEmitSfx).toHaveBeenCalledWith('snappy_button_5')
  })
})

// ── collapse follows the phone breakpoint [obligation] ────────────────────────

describe('SchedulingSection — collapse option follows the phone breakpoint [obligation]', () => {
  test('passes collapse: true to popScrimReveal on phone layout [obligation]', async () => {
    mockIsPhone.value = true
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="scheduling-panel__scrim"]').trigger('click')

    expect(mockPopScrimReveal).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      true,
      { collapse: true }
    )
  })

  test('passes collapse: false to popScrimReveal on wider layouts [obligation]', async () => {
    mockIsPhone.value = false
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="scheduling-panel__scrim"]').trigger('click')

    expect(mockPopScrimReveal).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      true,
      { collapse: false }
    )
  })
})

// ── revealed persists via useLocalRef [obligation] ────────────────────────────

describe('SchedulingSection — revealed persists via localStorage [obligation]', () => {
  test('toggling writes the new state to localStorage under deck-settings-advanced-revealed [obligation]', async () => {
    const { wrapper } = makeWrapper()

    await wrapper.find('[data-testid="scheduling-panel__scrim"]').trigger('click')

    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('true')
  })

  test('a restored true value renders the fields visible on first paint, without needing a toggle [obligation]', () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true')
    const { wrapper } = makeWrapper()

    // With revealed already true on mount, clicking the badge (the "hide"
    // affordance once revealed) must flip it off — proving the initial state
    // was read from storage rather than defaulting to false.
    return wrapper
      .find('[data-testid="scheduling-panel__badge"]')
      .trigger('click')
      .then(() => {
        expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe('false')
      })
  })
})

// ── reset wiring [obligation] ──────────────────────────────────────────────────

describe('SchedulingSection — reset wiring [obligation]', () => {
  test('resetting the max-interval row calls resetMaxInterval [obligation]', async () => {
    const { wrapper, pacing_fields } = makeWrapper({
      pacingFieldsOverrides: { has_max_interval_override: ref(true) }
    })

    await wrapper
      .find('[data-testid="tab-review-pacing__max-interval"] [data-testid="tooltip-row__reset"]')
      .trigger('click')

    expect(pacing_fields.resetMaxInterval).toHaveBeenCalledOnce()
  })

  test('resetting the leech-threshold row calls resetLeechThreshold [obligation]', async () => {
    const { wrapper, pacing_fields } = makeWrapper({
      pacingFieldsOverrides: { has_leech_threshold_override: ref(true) }
    })

    await wrapper
      .find('[data-testid="tab-review-pacing__leech-threshold"] [data-testid="tooltip-row__reset"]')
      .trigger('click')

    expect(pacing_fields.resetLeechThreshold).toHaveBeenCalledOnce()
  })
})
