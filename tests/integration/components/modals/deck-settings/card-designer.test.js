import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { reactive, defineComponent, h, ref, computed } from 'vue'
import CardDesigner from '@/components/modals/deck-settings/tab-design/card-designer/index.vue'

const { mockEmitSfx } = vi.hoisted(() => ({ mockEmitSfx: vi.fn() }))
vi.mock('@/sfx/bus', () => ({ emitSfx: mockEmitSfx }))

const useCardImagesRef = ref(false)

vi.mock('@/composables/use-can', () => ({
  useCan: () => ({
    useProFeature: computed(() => false),
    createDeck: computed(() => true),
    useCardImages: computed(() => useCardImagesRef.value)
  })
}))

const AlignPickerStub = defineComponent({
  name: 'AlignPicker',
  props: ['horizontal', 'vertical'],
  emits: ['update:horizontal', 'update:vertical'],
  setup(props, { emit }) {
    return () =>
      h('div', {
        'data-testid': 'align-picker-stub',
        'data-horizontal': props.horizontal ?? '',
        'data-vertical': props.vertical ?? '',
        onClick: () => {
          emit('update:horizontal', 'left')
          emit('update:vertical', 'top')
        }
      })
  }
})

const UiSpinboxStub = defineComponent({
  name: 'UiSpinbox',
  props: ['value', 'min', 'max', 'step', 'size', 'suffix'],
  emits: ['update:value'],
  setup(props, { emit }) {
    return () =>
      h('button', {
        'data-testid': 'ui-kit-spinbox-stub',
        'data-value': props.value,
        'data-min': props.min,
        'data-max': props.max,
        'data-step': props.step,
        onClick: () => emit('update:value', (props.value ?? 0) + 1)
      })
  }
})

function makeToolbar(initial = {}) {
  const attributes = reactive(initial)
  const wrapper = mount(CardDesigner, {
    props: { attributes },
    global: {
      stubs: { AlignPicker: AlignPickerStub, UiSpinbox: UiSpinboxStub }
    }
  })
  return { wrapper, attributes }
}

describe('CardDesigner', () => {
  beforeEach(() => {
    mockEmitSfx.mockClear()
    useCardImagesRef.value = false
  })

  test('renders the toolbar container', () => {
    const { wrapper } = makeToolbar()
    expect(wrapper.find('[data-testid="card-designer"]').exists()).toBe(true)
  })

  test('renders one align-picker', () => {
    const { wrapper } = makeToolbar()
    expect(wrapper.findAll('[data-testid="align-picker-stub"]')).toHaveLength(1)
  })

  test('passes horizontal_alignment + vertical_alignment to align-picker', () => {
    const { wrapper } = makeToolbar({ horizontal_alignment: 'right', vertical_alignment: 'top' })
    const picker = wrapper.find('[data-testid="align-picker-stub"]')
    expect(picker.attributes('data-horizontal')).toBe('right')
    expect(picker.attributes('data-vertical')).toBe('top')
  })

  test('align-picker updates write back to attributes', async () => {
    const { wrapper, attributes } = makeToolbar()
    await wrapper.find('[data-testid="align-picker-stub"]').trigger('click')
    expect(attributes.horizontal_alignment).toBe('left')
    expect(attributes.vertical_alignment).toBe('top')
  })

  test('renders the text size spinbox inline', () => {
    const { wrapper } = makeToolbar()
    expect(wrapper.findComponent({ name: 'UiSpinbox' }).exists()).toBe(true)
  })

  test('spinbox is configured with min=1, max=10, step=1', () => {
    const { wrapper } = makeToolbar()
    const spinbox = wrapper.findComponent({ name: 'UiSpinbox' })
    expect(spinbox.props('min')).toBe(1)
    expect(spinbox.props('max')).toBe(10)
    expect(spinbox.props('step')).toBe(1)
  })

  test('spinbox value defaults to level 4 when text_size unset', () => {
    const { wrapper } = makeToolbar()
    expect(wrapper.findComponent({ name: 'UiSpinbox' }).props('value')).toBe(4)
  })

  test('spinbox value reflects existing text_size on attributes', () => {
    const { wrapper } = makeToolbar({ text_size: 7 })
    expect(wrapper.findComponent({ name: 'UiSpinbox' }).props('value')).toBe(7)
  })

  test('spinbox update:value writes back to attributes.text_size', async () => {
    const { wrapper, attributes } = makeToolbar({ text_size: 4 })
    const spinbox = wrapper.findComponent({ name: 'UiSpinbox' })
    spinbox.vm.$emit('update:value', 8)
    await wrapper.vm.$nextTick()
    expect(attributes.text_size).toBe(8)
  })

  describe('image layout section gating', () => {
    test('hides image-layout-label and picker when useCardImages is false', () => {
      useCardImagesRef.value = false
      const { wrapper } = makeToolbar()
      expect(wrapper.find('[data-testid="card-designer__image-layout-label"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="image-layout-picker"]').exists()).toBe(false)
    })

    test('shows image-layout-label and picker when useCardImages is true', () => {
      useCardImagesRef.value = true
      const { wrapper } = makeToolbar()
      expect(wrapper.find('[data-testid="card-designer__image-layout-label"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="image-layout-picker"]').exists()).toBe(true)
    })
  })
})
