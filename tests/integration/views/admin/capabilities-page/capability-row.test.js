import { describe, test, expect, beforeEach, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import CapabilityRow from '@/views/admin/capabilities-page/capability-row.vue'

const { mutateMock } = vi.hoisted(() => ({ mutateMock: vi.fn() }))

vi.mock('@/api/capabilities', () => ({
  useUpdateCapabilityMutation: () => ({ mutate: mutateMock })
}))

function mountRow(item) {
  return mount(CapabilityRow, { props: { item } })
}

beforeEach(() => {
  mutateMock.mockClear()
})

describe('CapabilityRow — rendering', () => {
  test('reflects an on row as checked', () => {
    const wrapper = mountRow({ key: 'audio_reader', state: 'on' })
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(true)
  })

  test('reflects an off row as unchecked', () => {
    const wrapper = mountRow({ key: 'audio_reader', state: 'off' })
    expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(false)
  })

  test('renders the translated name and description for the row', () => {
    const wrapper = mountRow({ key: 'audio_reader', state: 'on' })
    expect(wrapper.find('[data-testid="admin-capabilities-row__name"]').text()).toBe('Audio reader')
    expect(wrapper.find('[data-testid="admin-capabilities-row__description"]').text()).toBe(
      'Lesson playback, transcription, and term lookups.'
    )
  })
})

describe('CapabilityRow — toggling', () => {
  test('flipping the toggle on calls the mutation with the row key and state "on"', async () => {
    const wrapper = mountRow({ key: 'audio_reader', state: 'off' })
    await wrapper.find('input[type="checkbox"]').setValue(true)

    expect(mutateMock).toHaveBeenCalledWith({ key: 'audio_reader', state: 'on' })
  })

  test('flipping the toggle off calls the mutation with the row key and state "off"', async () => {
    const wrapper = mountRow({ key: 'audio_reader', state: 'on' })
    await wrapper.find('input[type="checkbox"]').setValue(false)

    expect(mutateMock).toHaveBeenCalledWith({ key: 'audio_reader', state: 'off' })
  })
})
