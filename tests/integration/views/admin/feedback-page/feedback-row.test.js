import { describe, test, expect, vi, beforeEach } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref, useAttrs } from 'vue'
import FeedbackRow from '@/views/admin/feedback-page/feedback-row.vue'
import MemberPolaroid from '@/components/member/member-polaroid.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }))

const published = ref(true)
const status = ref('new')
const onPublishedChangeMock = vi.fn()
const onStatusChangeMock = vi.fn()

vi.mock('@/views/admin/feedback-page/use-feedback-row', () => ({
  useFeedbackRow: () => ({
    published,
    status,
    status_options: ref([
      { value: 'new', label: 'New' },
      { value: 'done', label: 'Shipped' }
    ]),
    onPublishedChange: onPublishedChangeMock,
    onStatusChange: onStatusChangeMock
  })
}))

const ToggleStub = defineComponent({
  name: 'UiToggle',
  inheritAttrs: false,
  props: { checked: Boolean },
  emits: ['update:checked'],
  setup(props, { slots, emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'button',
        {
          ...attrs,
          'data-checked': String(props.checked),
          onClick: () => emit('update:checked', !props.checked)
        },
        slots.default?.()
      )
  }
})

const SelectMenuStub = defineComponent({
  name: 'UiSelectMenu',
  inheritAttrs: false,
  props: { options: { type: Array, default: () => [] }, modelValue: String },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const attrs = useAttrs()
    return () =>
      h(
        'div',
        { ...attrs, 'data-value': props.modelValue },
        props.options.map((option) =>
          h(
            'button',
            {
              key: option.value,
              'data-testid': `admin-feedback-row__status-option-${option.value}`,
              onClick: () => emit('update:modelValue', option.value)
            },
            option.label
          )
        )
      )
  }
})

function makeItem(overrides = {}) {
  return {
    id: 1,
    title: 'Add dark mode',
    body: 'Please',
    member_display_name: 'Jamie',
    member_avatar: null,
    vote_count: 3,
    status: 'new',
    visibility: 'public',
    ...overrides
  }
}

function mountRow(item = makeItem()) {
  return shallowMount(FeedbackRow, {
    props: { item },
    global: {
      stubs: {
        AvatarImage: true,
        UiToggle: ToggleStub,
        UiSelectMenu: SelectMenuStub
      }
    }
  })
}

beforeEach(() => {
  published.value = true
  status.value = 'new'
  onPublishedChangeMock.mockReset()
  onStatusChangeMock.mockReset()
})

describe('FeedbackRow — rendering', () => {
  test('renders the item title, author, and vote count', () => {
    const wrapper = mountRow(makeItem({ title: 'Add dark mode', member_display_name: 'Jamie' }))
    expect(wrapper.text()).toContain('Add dark mode')
    expect(wrapper.find('[data-testid="admin-feedback-row__author"]').text()).toBe('Jamie')
    expect(wrapper.find('[data-testid="admin-feedback-row__vote-count"]').text()).toBe('3')
  })

  test('does not render the author line when member_display_name is absent', () => {
    const wrapper = mountRow(makeItem({ member_display_name: undefined }))
    expect(wrapper.find('[data-testid="admin-feedback-row__author"]').exists()).toBe(false)
  })

  test('the Published toggle reflects the composable state', () => {
    published.value = true
    const wrapper = mountRow()
    expect(
      wrapper.find('[data-testid="admin-feedback-row__published"]').attributes('data-checked')
    ).toBe('true')
  })

  test('the status select reflects the composable state', () => {
    status.value = 'done'
    const wrapper = mountRow()
    expect(
      wrapper.find('[data-testid="admin-feedback-row__status"]').attributes('data-value')
    ).toBe('done')
  })

  test('passes the member avatar and size="sm" to member-polaroid [obligation]', () => {
    const wrapper = mountRow(makeItem({ member_avatar: 'owl' }))
    const polaroid = wrapper.findComponent(MemberPolaroid)
    expect(polaroid.props('avatar')).toBe('owl')
    expect(polaroid.props('size')).toBe('sm')
  })

  test('passes size="sm" to the status select-menu [obligation]', () => {
    const wrapper = mountRow()
    expect(wrapper.find('[data-testid="admin-feedback-row__status"]').attributes('size')).toBe('sm')
  })
})

describe('FeedbackRow — control wiring', () => {
  test('toggling Published calls onPublishedChange with the new boolean', async () => {
    published.value = false
    const wrapper = mountRow()
    await wrapper.find('[data-testid="admin-feedback-row__published"]').trigger('click')
    expect(onPublishedChangeMock).toHaveBeenCalledWith(true)
  })

  test('picking a status option calls onStatusChange with that status', async () => {
    const wrapper = mountRow()
    await wrapper.find('[data-testid="admin-feedback-row__status-option-done"]').trigger('click')
    expect(onStatusChangeMock).toHaveBeenCalledWith('done')
  })
})
