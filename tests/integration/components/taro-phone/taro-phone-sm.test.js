import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import TaroPhoneSm from '@/components/taro-phone/taro-phone-sm.vue'
import { useTaroPhoneStore } from '@/stores/taro-phone'

function makeWrapper() {
  return mount(TaroPhoneSm, {
    global: { plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })] }
  })
}

describe('TaroPhoneSm — notification badge', () => {
  test('hides the badge when notification_count is 0', () => {
    const wrapper = makeWrapper()
    expect(wrapper.find('[data-testid="notification-badge"]').exists()).toBe(false)
  })

  test('shows the badge when notification_count > 0', async () => {
    const wrapper = makeWrapper()
    const store = useTaroPhoneStore()
    store.notify('settings', 1)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="notification-badge"]').exists()).toBe(true)
  })
})

describe('TaroPhoneSm — open', () => {
  test('emits open when clicked', async () => {
    const wrapper = makeWrapper()
    await wrapper.find('[data-testid="phone"]').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })
})
