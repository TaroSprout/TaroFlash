import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import SettingsApp from '@/components/taro-phone/apps/settings-app.vue'

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ({ value: false })
}))

const { mockOpenApp, mockSettingsModalOpen } = vi.hoisted(() => ({
  mockOpenApp: vi.fn(),
  mockSettingsModalOpen: vi.fn()
}))

vi.mock('@/stores/taro-phone', () => ({
  useTaroPhoneStore: () => ({ openApp: mockOpenApp })
}))

vi.mock('@/composables/settings/use-settings-modal', () => ({
  useSettingsModal: () => ({ open: mockSettingsModalOpen })
}))

describe('SettingsApp — openApp wiring', () => {
  test('pressing the app launches the settings modal through phone.openApp', async () => {
    const modal_result = { response: Promise.resolve(undefined) }
    mockSettingsModalOpen.mockReturnValueOnce(modal_result)

    const wrapper = mount(SettingsApp)
    await wrapper.find('[data-testid="phone-app"]').trigger('click')

    expect(mockSettingsModalOpen).toHaveBeenCalledOnce()
    expect(mockOpenApp).toHaveBeenCalledWith(modal_result)
  })
})
