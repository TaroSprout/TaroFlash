import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import CapabilitiesPage from '@/views/admin/capabilities-page/index.vue'

const mockCapabilities = ref(undefined)

vi.mock('@/api/capabilities', () => ({
  useCapabilitiesQuery: () => ({ data: mockCapabilities }),
  useUpdateCapabilityMutation: () => ({ mutate: vi.fn() })
}))

const CapabilityRowStub = defineComponent({
  name: 'CapabilityRow',
  props: ['item'],
  setup(props) {
    return () => h('div', { 'data-testid': 'capability-row-stub', 'data-item-key': props.item.key })
  }
})

function mountPage() {
  return shallowMount(CapabilitiesPage, {
    global: { stubs: { CapabilityRow: CapabilityRowStub } }
  })
}

beforeEach(() => {
  mockCapabilities.value = undefined
})

describe('CapabilitiesPage', () => {
  test('renders no rows while the capabilities query is pending', () => {
    const wrapper = mountPage()
    expect(wrapper.findAllComponents(CapabilityRowStub)).toHaveLength(0)
  })

  test('renders one capability-row per row from useCapabilitiesQuery', () => {
    mockCapabilities.value = [
      { key: 'audio_reader', state: 'on' },
      { key: 'other_capability', state: 'off' }
    ]
    const wrapper = mountPage()
    expect(wrapper.findAllComponents(CapabilityRowStub)).toHaveLength(2)
  })

  test('passes each row through to its capability-row', () => {
    mockCapabilities.value = [{ key: 'audio_reader', state: 'on' }]
    const wrapper = mountPage()
    expect(wrapper.findComponent(CapabilityRowStub).props('item')).toEqual({
      key: 'audio_reader',
      state: 'on'
    })
  })

  test('renders no rows when the capabilities list is empty', () => {
    mockCapabilities.value = []
    const wrapper = mountPage()
    expect(wrapper.findAllComponents(CapabilityRowStub)).toHaveLength(0)
  })
})
