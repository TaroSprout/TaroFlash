import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import FeedbackPage from '@/views/admin/feedback-page/index.vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }))

const mockItems = ref(undefined)

vi.mock('@/api/feedback', () => ({
  useAdminFeedbackItemsQuery: () => ({ data: mockItems }),
  useUpdateFeedbackItemMutation: () => ({ mutateAsync: vi.fn() })
}))

const FeedbackRowStub = defineComponent({
  name: 'FeedbackRow',
  props: ['item'],
  setup(props) {
    return () => h('div', { 'data-testid': 'feedback-row-stub', 'data-item-id': props.item.id })
  }
})

function mountPage() {
  return shallowMount(FeedbackPage, {
    global: {
      stubs: { FeedbackRow: FeedbackRowStub, ScrollBar: true }
    }
  })
}

beforeEach(() => {
  mockItems.value = undefined
})

describe('FeedbackPage — loading', () => {
  test('does not render the empty state while data is undefined', () => {
    const wrapper = mountPage()
    expect(wrapper.find('[data-testid="admin-feedback-page__empty"]').exists()).toBe(false)
    expect(wrapper.findAllComponents(FeedbackRowStub)).toHaveLength(0)
  })
})

describe('FeedbackPage — content', () => {
  test('renders one feedback-row per item from useAdminFeedbackItemsQuery', () => {
    mockItems.value = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const wrapper = mountPage()
    expect(wrapper.findAllComponents(FeedbackRowStub)).toHaveLength(3)
  })

  test('passes each item through to its feedback-row', () => {
    mockItems.value = [{ id: 7 }]
    const wrapper = mountPage()
    expect(wrapper.findComponent(FeedbackRowStub).props('item')).toEqual({ id: 7 })
  })

  test('renders the empty state when the list is empty', () => {
    mockItems.value = []
    const wrapper = mountPage()
    expect(wrapper.find('[data-testid="admin-feedback-page__empty"]').exists()).toBe(true)
    expect(wrapper.findAllComponents(FeedbackRowStub)).toHaveLength(0)
  })
})
