import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import SwitchesPage from '@/views/admin/switches-page/index.vue'

const mockSwitches = ref(undefined)

vi.mock('@/api/capabilities', () => ({
  useCapabilitySwitchesQuery: () => ({ data: mockSwitches }),
  useUpdateCapabilitySwitchMutation: () => ({ mutate: vi.fn() })
}))

const SwitchRowStub = defineComponent({
  name: 'SwitchRow',
  props: ['item'],
  setup(props) {
    return () => h('div', { 'data-testid': 'switch-row-stub', 'data-item-key': props.item.key })
  }
})

function mountPage() {
  return shallowMount(SwitchesPage, {
    global: { stubs: { SwitchRow: SwitchRowStub } }
  })
}

beforeEach(() => {
  mockSwitches.value = undefined
})

describe('SwitchesPage', () => {
  test('renders no rows while the switches query is pending', () => {
    const wrapper = mountPage()
    expect(wrapper.findAllComponents(SwitchRowStub)).toHaveLength(0)
  })

  test('renders one switch-row per row from useCapabilitySwitchesQuery', () => {
    mockSwitches.value = [
      { key: 'audio_reader', state: 'on' },
      { key: 'other_switch', state: 'off' }
    ]
    const wrapper = mountPage()
    expect(wrapper.findAllComponents(SwitchRowStub)).toHaveLength(2)
  })

  test('passes each row through to its switch-row', () => {
    mockSwitches.value = [{ key: 'audio_reader', state: 'on' }]
    const wrapper = mountPage()
    expect(wrapper.findComponent(SwitchRowStub).props('item')).toEqual({
      key: 'audio_reader',
      state: 'on'
    })
  })

  test('renders no rows when the switches list is empty', () => {
    mockSwitches.value = []
    const wrapper = mountPage()
    expect(wrapper.findAllComponents(SwitchRowStub)).toHaveLength(0)
  })
})
