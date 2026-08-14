import { describe, test, expect, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import AdminApp from '@/components/taro-phone/apps/admin-app.vue'

vi.mock('@/composables/ui/media-query', () => ({
  useMatchMedia: () => ({ value: false })
}))

const { mockOpenApp, mockAdminModalOpen } = vi.hoisted(() => ({
  mockOpenApp: vi.fn(),
  mockAdminModalOpen: vi.fn()
}))

vi.mock('@/stores/taro-phone', () => ({
  useTaroPhoneStore: () => ({ openApp: mockOpenApp })
}))

vi.mock('@/composables/admin/use-admin-modal', () => ({
  useAdminModal: () => ({ open: mockAdminModalOpen })
}))

describe('AdminApp — openApp wiring [obligation]', () => {
  test('pressing the app launches the admin modal through phone.openApp', async () => {
    const modal_result = { response: Promise.resolve(undefined) }
    mockAdminModalOpen.mockReturnValueOnce(modal_result)

    const wrapper = mount(AdminApp)
    await wrapper.find('[data-testid="phone-app"]').trigger('click')

    expect(mockAdminModalOpen).toHaveBeenCalledOnce()
    expect(mockOpenApp).toHaveBeenCalledWith(modal_result)
  })
})
